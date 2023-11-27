import type { H3Event } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { ofetch } from 'ofetch'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import { randomUUID } from 'crypto'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthBattledotnetConfig {
  /**
   * Battle.net OAuth Client ID
   * @default process.env.NUXT_OAUTH_BATTLEDOTNET_CLIENT_ID
   */
  clientId?: string
  /**
   * Battle.net OAuth Client Secret
   * @default process.env.NUXT_OAUTH_BATTLEDOTNET_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Battle.net OAuth Scope
   * @default []
   * @see https://develop.battle.net/documentation/guides/using-oauth
   * @example ['openid', 'wow.profile', 'sc2.profile', 'd3.profile']
   */
  scope?: string[]
  /**
   * Battle.net OAuth Region
   * @default EU
   * @see https://develop.battle.net/documentation/guides/using-oauth
   * @example EU (possible values: US, EU, APAC)
   */
  region?: string
  /**
   * Battle.net OAuth Authorization URL
   * @default 'https://oauth.battle.net/authorize'
   */
  authorizationURL?: string
  /**
   * Battle.net OAuth Token URL
   * @default 'https://oauth.battle.net/token'
   */
  tokenURL?: string
}

export function battledotnetEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthBattledotnetConfig>) {
    return eventHandler(async (event: H3Event) => {

    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.battledotnet, {
      authorizationURL: 'https://oauth.battle.net/authorize',
      tokenURL: 'https://oauth.battle.net/token'
    }) as OAuthBattledotnetConfig

    const query = getQuery(event)
    const { code } = query

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Battle.net login failed: ${query.error || 'Unknown error'}`,
        data: query
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_BATTLEDOTNET_CLIENT_ID or NUXT_OAUTH_BATTLEDOTNET_CLIENT_SECRET env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!code) {
      config.scope = config.scope || ['openid']
      config.region = config.region || 'EU'

      if (config.region === 'CN') {
        config.authorizationURL = 'https://oauth.battlenet.com.cn/authorize'
        config.tokenURL = 'https://oauth.battlenet.com.cn/token'
      }

      // Redirect to Battle.net Oauth page
      const redirectUrl = getRequestURL(event).href
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
          state: randomUUID(), // Todo: handle PKCE flow
          response_type: 'code',
        })
      )
    }

    const redirectUrl = getRequestURL(event).href
    config.scope = config.scope || []
    if (!config.scope.includes('openid')) {
      config.scope.push('openid')
    }

    const authCode = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

    const tokens: any = await $fetch(
      config.tokenURL as string,
      {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authCode}`,
          },
          params: {
          code,
          grant_type: 'authorization_code',
          scope: config.scope.join(' '),
          redirect_uri: parsePath(redirectUrl).pathname,
        }
      }
    ).catch((error) => {
        return { error }
      })

    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Battle.net login failed: ${tokens.error || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token

    const user: any = await ofetch('https://oauth.battle.net/userinfo', {
      headers: {
        'User-Agent': `Battledotnet-OAuth-${config.clientId}`,
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!user) {
        const error = createError({
          statusCode: 500,
          message: 'Could not get Battle.net user',
          data: tokens
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
