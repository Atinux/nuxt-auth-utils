import type { H3Event } from 'h3'
import { createError, deleteCookie, eventHandler, getCookie, getQuery, sendRedirect, setCookie } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { $fetch } from 'ofetch'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleInvalidState, handleState, requestAccessToken } from '../utils'
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

/**
 * Registered apps, cached in-memory and keyed by instance domain, so we don't call `POST /api/v1/apps`
 * again on every login against the same instance. This mirrors the in-memory session store used by the
 * Bluesky provider (`src/runtime/server/lib/atproto/bluesky.ts`): it is intentionally simple and will be
 * cleared on server restart or on serverless cold starts. If registrations need to survive restarts or be
 * shared across instances, replace this with a persistent `useStorage()` binding.
 */
const appRegistry = new Map<string, MastodonApp>()

/**
 * Accepts a bare instance domain (`mastodon.social`) or a full handle (`@user@mastodon.social` or
 * `user@mastodon.social`) and returns the instance domain.
 */
function resolveInstanceDomain(input: string): string {
  const withoutProtocol = input.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const withoutLeadingAt = withoutProtocol.replace(/^@/, '')
  return withoutLeadingAt.includes('@') ? withoutLeadingAt.split('@').pop()! : withoutLeadingAt
}

async function getOrRegisterApp(instance: string, redirectURL: string, scope: string, clientName: string): Promise<MastodonApp> {
  const cached = appRegistry.get(instance)
  if (cached) return cached

  const app = await $fetch<{ client_id: string, client_secret: string }>(`https://${instance}/api/v1/apps`, {
    method: 'POST',
    body: {
      client_name: clientName,
      redirect_uris: redirectURL,
      scopes: scope,
    },
  })

  const registered: MastodonApp = { client_id: app.client_id, client_secret: app.client_secret }
  appRegistry.set(instance, registered)
  return registered
}

export function defineOAuthMastodonEventHandler<TUser = OAuthMastodonUser>({ config, onSuccess, onError }: OAuthConfig<OAuthMastodonConfig, { user: TUser, tokens: MastodonTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.mastodon, {
      clientName: 'Nuxt Auth Utils',
      scope: ['read'],
    }) as OAuthMastodonConfig

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
        secure: true,
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

    const user = await $fetch<TUser>(`https://${instance}/api/v1/accounts/verify_credentials`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
