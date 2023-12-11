import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'
import { type OAuthChecks, checks } from '../../utils/security'

export interface OAuthOidcConfig {
  /**
   * OIDC Client ID
   * @default process.env.NUXT_OAUTH_OIDC_CLIENT_ID
   */
  clientId?: string
  /**
   * OIDC Client Secret
   * @default process.env.NUXT_OAUTH_OIDC_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * OIDC Response Type
   * @default process.env.NUXT_OAUTH_OIDC_RESPONSE_TYPE
   */
  responseType?: string
  /**
   * OIDC Authorization Endpoint URL
   * @default process.env.NUXT_OAUTH_OIDC_AUTHORIZATION_URL
   */
  authorizationUrl?: string
  /**
   * OIDC Token Endpoint URL
   * @default process.env.NUXT_OAUTH_OIDC_TOKEN_URL
   */
  tokenUrl?: string
  /**
   * OIDC Userino Endpoint URL
   * @default process.env.NUXT_OAUTH_OIDC_USERINFO_URL
   */
  userinfoUrl?: string
  /**
   * OIDC Redirect URI
   * @default process.env.NUXT_OAUTH_OIDC_USERINFO_URL
   */
  redirectUri?: string
  /**
   * OIDC Code challenge method
   * @default process.env.NUXT_OAUTH_OIDC_CODE_CHALLENGE_METHOD
   */
  codeChallengeMethod?: string
  /**
   * OIDC Grant Type
   * @default process.env.NUXT_OAUTH_OIDC_GRANT_TYPE
   */
  grantType?: string
  /**
   * OIDC Claims
   * @default process.env.NUXT_OAUTH_OIDC_AUDIENCE
   */
  audience?: string
  /**
   * OIDC Claims
   * @default {}
   */
  claims?: {}
  /**
   * OIDC Scope
   * @default []
   * @example ['openid']
   */
  scope?: string[]
  /**
   * checks
   * @default []
   * @see https://auth0.com/docs/flows/authorization-code-flow-with-proof-key-for-code-exchange-pkce
   * @see https://auth0.com/docs/protocols/oauth2/oauth-state
   */
  checks?: OAuthChecks[]
}

function validateConfig(config: any) {
  const requiredConfigKeys = ['clientId', 'clientSecret', 'authorizationUrl', 'tokenUrl', 'userinfoUrl', 'redirectUri', 'responseType']
  const missingConfigKeys: string[] = []
  requiredConfigKeys.forEach(key => {
    if (!config[key]) {
      missingConfigKeys.push(key)
    }
  })
  if (missingConfigKeys.length) {
    const error = createError({
      statusCode: 500,
      message: `Missing config keys: ${missingConfigKeys.join(', ')}`
    })

    return {
      valid: false,
      error
    }
  }
  return { valid: true }
}

export function oidcEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthOidcConfig>) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.oidc) as OAuthOidcConfig
    const { code } = getQuery(event)

    const validationResult = validateConfig(config)

    if (!validationResult.valid && validationResult.error) {
      if (!onError) throw validationResult.error
      return onError(event, validationResult.error)
    }

    if (!code) {
      const authParams = await checks.create(event, config.checks) // Initialize checks
      // Redirect to OIDC login page
      return sendRedirect(
        event,
        withQuery(config.authorizationUrl as string, {
          response_type: config.responseType,
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          scope: config?.scope?.join(' ') || 'openid',
          claims: config?.claims || {},
          grant_type: config.grantType || 'authorization_code',
          audience: config.audience || null,
          ...authParams
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

    // @ts-ignore
    const queryString = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      response_type: config.responseType,
      grant_type: config.grantType || 'authorization_code',
      ...checkResult
    })

    // Request tokens.
    const tokens: any = await ofetch(
      config.tokenUrl as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: queryString.toString(),
      }
    ).catch(error => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `OIDC login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    const userInfoUrl = config.userinfoUrl || ''

    // Request userinfo.
    const user: any = await ofetch(userInfoUrl, {
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
