import type { H3Event } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthCognitoConfig {
  /**
   * AWS Cognito App Client ID
   * @default process.env.NUXT_OAUTH_COGNITO_CLIENT_ID
   */
  clientId?: string
  /**
   * AWS Cognito App Client Secret
   * @default process.env.NUXT_OAUTH_COGNITO_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * AWS Cognito User Pool ID
   * @default process.env.NUXT_OAUTH_COGNITO_USER_POOL_ID
   */
  userPoolId?: string
  /**
   * AWS Cognito Region
   * @default process.env.NUXT_OAUTH_COGNITO_REGION
   */
  region?: string
  /**
   * AWS Cognito Scope
   * @default []
   */
  scope?: string[]
}

export function cognitoEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthCognitoConfig>) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.cognito) as OAuthCognitoConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.userPoolId || !config.region) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_COGNITO_CLIENT_ID, NUXT_OAUTH_COGNITO_CLIENT_SECRET, NUXT_OAUTH_COGNITO_USER_POOL_ID, or NUXT_OAUTH_COGNITO_REGION env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const authorizationURL = `https://${config.userPoolId}.auth.${config.region}.amazoncognito.com/oauth2/authorize`
    const tokenURL = `https://${config.userPoolId}.auth.${config.region}.amazoncognito.com/oauth2/token`

    const redirectUrl = getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || ['openid', 'profile']
      // Redirect to Cognito login page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          response_type: 'code',
          scope: config.scope.join(' '),
        })
      )
    }

    const tokens: any = await ofetch(
      tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=authorization_code&client_id=${config.clientId}&client_secret=${config.clientSecret}&redirect_uri=${parsePath(redirectUrl).pathname}&code=${code}`,
      }
    ).catch(error => {
      return { error }
    })

    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Cognito login failed: ${tokens.error_description || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    const user: any = await ofetch(`https://${config.userPoolId}.auth.${config.region}.amazoncognito.com/oauth2/userInfo`, {
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