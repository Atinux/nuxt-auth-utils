import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'
import { type OAuthChecks, checks } from '../../utils/security'

export interface OAuthAuth0Config {
  /**
   * Auth0 OAuth Client ID
   * @default process.env.NUXT_OAUTH_AUTH0_CLIENT_ID
   */
  clientId?: string
  /**
   * Auth0 OAuth Client Secret
   * @default process.env.NUXT_OAUTH_AUTH0_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Auth0 OAuth Issuer
   * @default process.env.NUXT_OAUTH_AUTH0_DOMAIN
   */
  domain?: string
  /**
   * Auth0 OAuth Audience
   * @default ''
   */
  audience?: string
  /**
   * Auth0 OAuth Scope
   * @default []
   * @see https://auth0.com/docs/get-started/apis/scopes/openid-connect-scopes
   * @example ['openid']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean
  /**
   * Maximum Authentication Age. If the elapsed time is greater than this value, the OP must attempt to actively re-authenticate the end-user.
   * @default 0
   * @see https://auth0.com/docs/authenticate/login/max-age-reauthentication
   */
  maxAge?: number
  /** 
   * checks
   * @default []
   * @see https://auth0.com/docs/flows/authorization-code-flow-with-proof-key-for-code-exchange-pkce
   * @see https://auth0.com/docs/protocols/oauth2/oauth-state
   */
  checks?: OAuthChecks[]
}

export function auth0EventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthAuth0Config>) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.auth0) as OAuthAuth0Config
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.domain) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_AUTH0_CLIENT_ID or NUXT_OAUTH_AUTH0_CLIENT_SECRET or NUXT_OAUTH_AUTH0_DOMAIN env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }
    const authorizationURL = `https://${config.domain}/authorize`
    const tokenURL = `https://${config.domain}/oauth/token`

    const redirectUrl = getRequestURL(event).href
    if (!code) {
      const authParam = await checks.create(event, config.checks) // Initialize checks
      config.scope = config.scope || ['openid', 'offline_access']
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }
      // Redirect to Auth0 Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
          audience: config.audience || '',
          max_age: config.maxAge || 0,
          ...authParam
        })
      )
    }

    // Verify checks
    let checkResult
    try {
      checkResult = await checks.use(event, config.checks)
    } catch (error) {
      if (!onError) throw error
      return onError(event, error as H3Error)
    }

    const tokens: any = await ofetch(
      tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: parsePath(redirectUrl).pathname,
          code,
          ...checkResult
        }
      }
    ).catch(error => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Auth0 login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    const user: any = await ofetch(`https://${config.domain}/userinfo`, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`
      }
    })

    return onSuccess(event, {
      tokens,
      user
    })
  })
}
