import type { H3Event } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthPaypalConfig {
  /**
   * PayPal Client ID
   * @default process.env.NUXT_OAUTH_PAYPAL_CLIENT_ID
   */
  clientId?: string

  /**
   * PayPal OAuth Client Secret
   * @default process.env.NUXT_OAUTH_PAYPAL_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * PayPal OAuth Scope
   * @default []
   * @see https://developer.paypal.com/docs/log-in-with-paypal/integrate/reference/#scope-attributes
   * @example ['email', 'profile']
   */
  scope?: string[]

  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * Use PayPal sandbox environment
   * @default import.meta.dev // true in development, false in production
   */
  sandbox?: boolean

  /**
   * PayPal OAuth Authorization URL
   * @default 'https://www.paypal.com/signin/authorize'
   */
  authorizationURL?: string

  /**
   * PayPal OAuth Token URL
   * @default 'https://api-m.paypal.com/v1/oauth2/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developer.paypal.com/docs/log-in-with-paypal/integrate/build-button/#link-constructauthorizationendpoint
   * @example { flowEntry: 'static' }
   */
  authorizationParams?: Record<string, string>
}

export function paypalEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthPaypalConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.paypal, {
      sandbox: import.meta.dev,
      authorizationURL: 'https://www.paypal.com/signin/authorize',
      tokenURL: 'https://api-m.paypal.com/v1/oauth2/token',
      authorizationParams: {},
    }) as OAuthPaypalConfig
    const { code } = getQuery(event)

    if (!config.clientId) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_PAYPAL_CLIENT_ID env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    let paypalAPI = 'api-m.paypal.com'

    if (config.sandbox) {
      paypalAPI = 'api-m.sandbox.paypal.com'
      config.authorizationURL = 'https://www.sandbox.paypal.com/signin/authorize'
      config.tokenURL = `https://${paypalAPI}/v1/oauth2/token`
    }

    const redirectUrl = getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || []
      if (!config.scope.includes('openid')) {
        config.scope.push('openid')
      }
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }

      // Redirect to PayPal Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
          flowEntry: 'static',
          ...config.authorizationParams,
        }),
      )
    }

    const authCode = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(
      config.tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authCode}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: {
          grant_type: 'authorization_code',
          redirect_uri: encodeURIComponent(parsePath(redirectUrl).pathname),
          code,
        },
      },
    ).catch((error) => {
      return { error }
    })

    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `PayPal login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users: any = await $fetch(`https://${paypalAPI}/v1/identity/openidconnect/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      params: {
        schema: 'openid',
      },
    })

    const user = users

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get PayPal user',
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
