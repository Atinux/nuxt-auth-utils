import type { H3Event } from 'h3'
import {
  eventHandler,
  createError,
  getQuery,
  getRequestURL,
  sendRedirect,
} from 'h3'
import { ofetch } from 'ofetch'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthKeycloakConfig {
  /**
   * Keycloak OAuth Client ID
   * @default process.env.NUXT_OAUTH_KEYCLOAK_CLIENT_ID
   */
  clientId?: string
  /**
   * Keycloak OAuth Client Secret
   * @default process.env.NUXT_OAUTH_KEYCLOAK_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Keycloak OAuth Server URL
   * @example http://192.168.1.10:8080/auth
   * @default process.env.NUXT_OAUTH_KEYCLOAK_SERVER_URL
   */
  serverUrl?: string
  /**
   * Keycloak OAuth Realm
   * @default process.env.NUXT_OAUTH_KEYCLOAK_REALM
   */
  realm?: string
  /**
   * Keycloak OAuth Scope
   * @default []
   * @see https://www.keycloak.org/docs/latest/authorization_services/
   * @example ['openid']
   */
  scope?: string[]
}

export function keycloakEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthKeycloakConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(
      config,
      // @ts-ignore
      useRuntimeConfig(event).oauth?.keycloak
    ) as OAuthKeycloakConfig

    const query = getQuery(event)
    const { code } = query

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Keycloak login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (
      !config.clientId ||
      !config.clientSecret ||
      !config.serverUrl ||
      !config.realm
    ) {
      const error = createError({
        statusCode: 500,
        message:
          'Missing NUXT_OAUTH_KEYCLOAK_CLIENT_ID or NUXT_OAUTH_KEYCLOAK_CLIENT_SECRET or NUXT_OAUTH_KEYCLOAK_SERVER_URL or NUXT_OAUTH_KEYCLOAK_REALM env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const realmURL = `${config.serverUrl}/realms/${config.realm}`

    const authorizationURL = `${realmURL}/protocol/openid-connect/auth`
    const tokenURL = `${realmURL}/protocol/openid-connect/token`
    const redirectUrl = getRequestURL(event).href

    if (!code) {
      config.scope = config.scope || ['openid']

      // Redirect to Keycloak Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
          response_type: 'code',
        })
      )
    }

    config.scope = config.scope || []
    if (!config.scope.includes('openid')) {
      config.scope.push('openid')
    }

    const tokens: any = await ofetch(tokenURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: parsePath(redirectUrl).pathname,
        code: code as string,
      }).toString(),
    }).catch((error) => {
      return { error }
    })

    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Keycloak login failed: ${
          tokens.error?.data?.error_description || 'Unknown error'
        }`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token

    const user: any = await ofetch(
      `${realmURL}/protocol/openid-connect/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Keycloak user',
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
