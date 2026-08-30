import type { H3Event } from 'h3'
import { createError, deleteCookie, eventHandler, getCookie, getQuery, sendRedirect, setCookie } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { $fetch } from 'ofetch'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleInvalidState, handleState, isDevelopment, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthMastodonConfig {
  /**
   * The instance domain to authenticate against, e.g. `mastodon.social`.
   *
   * Unlike most OAuth providers, a Mastodon account lives on a single instance and there is no
   * shared authorization server, so the instance must be known before the flow can start. If not
   * set here, it can be provided at runtime as an `instance` query parameter on the initial request
   * (e.g. `/auth/mastodon?instance=mastodon.social`). A full handle such as `@user@mastodon.social`
   * or `user@mastodon.social` is also accepted, only the domain part is used.
   * @default process.env.NUXT_OAUTH_MASTODON_INSTANCE
   * @example 'mastodon.social'
   */
  instance?: string
  /**
   * The name of the application shown to users on the instance's authorization screen.
   *
   * Mastodon has no concept of a pre-registered, shared client id: an application must be
   * registered against every instance it authenticates users on (`POST /api/v1/apps`). This is
   * that application's display name.
   * @default 'Nuxt Auth Utils'
   */
  clientName?: string
  /**
   * Mastodon OAuth Scope.
   * @default ['read']
   * @see https://docs.joinmastodon.org/api/oauth-scopes/
   * @example ['read', 'read:accounts']
   */
  scope?: string[]
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_MASTODON_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

// https://docs.joinmastodon.org/entities/Account/
export interface OAuthMastodonUser {
  id: string
  username: string
  /**
   * Always the full `user@instance` handle here, even for the authenticated user's own account.
   * Mastodon's API normally only qualifies `acct` with `@instance` for remote accounts and returns
   * the bare username for your own, we normalize it since an account only means something together
   * with the instance it lives on.
   */
  acct: string
  display_name: string
  url: string
  avatar: string
  [key: string]: unknown
}

interface MastodonTokens {
  access_token: string
  token_type: string
  scope: string
  created_at: number
}

interface MastodonApp {
  client_id: string
  client_secret: string
}

const INSTANCE_COOKIE_NAME = 'nuxt-auth-mastodon-instance'

// Registered apps per instance, so we don't re-register on every login. In-memory like the Bluesky
// provider's session store: cleared on restart/cold start, swap for useStorage() if that's a problem
// (e.g. multiple server workers, where a callback landing on a different worker than the one that
// registered the app would fail to find its credentials here).
const appRegistry = new Map<string, MastodonApp>()
// In-flight registration promises, so two concurrent first logins to the same instance await the same
// registration instead of registering two separate apps (the second `set()` would otherwise silently
// invalidate the `client_secret` the first request is about to use).
const pendingRegistrations = new Map<string, Promise<MastodonApp>>()
// Arbitrary cap on distinct instances we'll register apps for, since `instance` is caller-controlled
// input: without a bound, a stream of made-up instance domains would grow this map forever.
const MAX_REGISTERED_INSTANCES = 1000

/**
 * Accepts a bare instance domain (`mastodon.social`) or a full handle (`@user@mastodon.social` or
 * `user@mastodon.social`) and returns the instance domain.
 */
function resolveInstanceDomain(input: string): string {
  const withoutProtocol = input.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const withoutLeadingAt = withoutProtocol.replace(/^@/, '')
  return withoutLeadingAt.includes('@') ? withoutLeadingAt.split('@').pop()! : withoutLeadingAt
}

// `instance` is user-controlled, so we register applications and exchange tokens only against domains
// that look like public internet hostnames: this blocks the obvious SSRF vectors (loopback, private,
// link-local ranges, and bare IPs). It relies on the hostname string alone and does not resolve DNS, so
// a domain that only resolves to a private address at request time is not caught here.
function isPubliclyAddressableInstance(instance: string): boolean {
  if (!instance || /\s/.test(instance)) return false
  if (instance === 'localhost' || instance.endsWith('.localhost') || instance.endsWith('.local')) return false
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(instance)) return false // bare IPv4
  if (instance.includes(':')) return false // bare IPv6 or a stray port
  return true
}

async function registerApp(instance: string, redirectURL: string, scope: string, clientName: string): Promise<MastodonApp> {
  const app = await $fetch<{ client_id: string, client_secret: string }>(`https://${instance}/api/v1/apps`, {
    method: 'POST',
    body: {
      client_name: clientName,
      redirect_uris: redirectURL,
      scopes: scope,
    },
  })

  return { client_id: app.client_id, client_secret: app.client_secret }
}

async function getOrRegisterApp(instance: string, redirectURL: string, scope: string, clientName: string): Promise<MastodonApp> {
  const cached = appRegistry.get(instance)
  if (cached) return cached

  const pending = pendingRegistrations.get(instance)
  if (pending) return pending

  const registration = registerApp(instance, redirectURL, scope, clientName)
    .then((app) => {
      if (appRegistry.size >= MAX_REGISTERED_INSTANCES && !appRegistry.has(instance)) {
        const oldestInstance = appRegistry.keys().next().value
        if (oldestInstance) appRegistry.delete(oldestInstance)
      }
      appRegistry.set(instance, app)
      return app
    })
    .finally(() => {
      pendingRegistrations.delete(instance)
    })

  pendingRegistrations.set(instance, registration)
  return registration
}

export function defineOAuthMastodonEventHandler<TUser = OAuthMastodonUser>({ config: userConfig, onSuccess, onError }: OAuthConfig<OAuthMastodonConfig, { user: TUser, tokens: MastodonTokens }>) {
  return eventHandler(async (event: H3Event) => {
    // Merge into a fresh object each request instead of reassigning `userConfig`: defu concatenates
    // arrays, so reusing the same reference across requests would grow `scope` by one 'read' every time.
    const config: OAuthMastodonConfig = defu({}, userConfig, useRuntimeConfig(event).oauth?.mastodon, {
      clientName: 'Nuxt Auth Utils',
      scope: ['read'],
    })

    const query = getQuery<{ code?: string, error?: string, state?: string, instance?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Mastodon login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)
    const scope = (config.scope || ['read']).join(' ')

    if (!query.code) {
      const rawInstance = query.instance?.toString() || config.instance
      if (!rawInstance) {
        const error = createError({
          statusCode: 400,
          message: 'Mastodon login failed: missing instance. Provide it via the `instance` query parameter (e.g. `/auth/mastodon?instance=mastodon.social`), a full handle (`@user@mastodon.social`), or the `instance` config/`NUXT_OAUTH_MASTODON_INSTANCE` env variable.',
        })
        if (!onError) throw error
        return onError(event, error)
      }

      const instance = resolveInstanceDomain(rawInstance)

      if (!isPubliclyAddressableInstance(instance)) {
        const error = createError({
          statusCode: 400,
          message: `Mastodon login failed: "${instance}" is not a valid instance domain.`,
        })
        if (!onError) throw error
        return onError(event, error)
      }

      let app: MastodonApp
      try {
        app = await getOrRegisterApp(instance, redirectURL, scope, config.clientName || 'Nuxt Auth Utils')
      }
      catch {
        const error = createError({
          statusCode: 500,
          message: `Mastodon login failed: could not register the application with instance "${instance}". Make sure it is a reachable Mastodon (or compatible) server.`,
        })
        if (!onError) throw error
        return onError(event, error)
      }

      // Mastodon does not echo back the instance on the callback, so we remember which instance this
      // flow was started against in order to complete the token exchange with the right app credentials.
      setCookie(event, INSTANCE_COOKIE_NAME, instance, {
        httpOnly: true,
        secure: !isDevelopment,
        sameSite: 'lax',
        maxAge: 60 * 10,
        path: '/',
      })

      return sendRedirect(event, withQuery(`https://${instance}/oauth/authorize`, {
        client_id: app.client_id,
        redirect_uri: redirectURL,
        response_type: 'code',
        scope,
        state,
      }))
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'mastodon', onError)
    }

    const instance = getCookie(event, INSTANCE_COOKIE_NAME)
    deleteCookie(event, INSTANCE_COOKIE_NAME, { path: '/' })

    if (!instance) {
      const error = createError({
        statusCode: 400,
        message: 'Mastodon login failed: could not determine which instance to complete the login against (missing instance cookie, the flow may have taken too long or cookies are blocked).',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const app = appRegistry.get(instance)
    if (!app) {
      const error = createError({
        statusCode: 500,
        message: `Mastodon login failed: no registered application found for instance "${instance}".`,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokens = await requestAccessToken(`https://${instance}/oauth/token`, {
      body: {
        grant_type: 'authorization_code',
        client_id: app.client_id,
        client_secret: app.client_secret,
        redirect_uri: redirectURL,
        code: query.code,
        scope,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'mastodon', tokens, onError)
    }

    const account = await $fetch<OAuthMastodonUser>(`https://${instance}/api/v1/accounts/verify_credentials`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    // Mastodon only qualifies `acct` with `@instance` for remote accounts, own account comes back as
    // just the username. Normalize it since the identity only makes sense together with its instance.
    const user = {
      ...account,
      acct: account.acct.includes('@') ? account.acct : `${account.acct}@${instance}`,
    } as TUser

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
