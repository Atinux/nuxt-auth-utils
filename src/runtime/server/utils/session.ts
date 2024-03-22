import type { H3Event, SessionConfig } from 'h3'
import { useSession, createError } from 'h3'
import { defu } from 'defu'
import { createHooks } from 'hookable'
import { useRuntimeConfig } from '#imports'
import type { PrivateSessionData, PublicSessionData } from '#auth-utils'
import type { ActiveUserSession, UserSession } from '../../types/session'

export interface SessionHooks {
  /**
   * Called when fetching the session from the API
   * - Add extra properties to the session
   * - Throw an error if the session could not be verified (with a database for example)
   */
  'fetch': (session: UserSession, event: H3Event) => void | Promise<void>
  /**
   * Called before clearing the session
   */
  'clear': (session: UserSession, event: H3Event) => void | Promise<void>
}

export const sessionHooks = createHooks<SessionHooks>()

export async function getUserSession (event: H3Event) {
  return (await _useSession(event)).data
}

/**
 * Set a user session
 * @param event
 * @param publicData User session data, please only store public information since it can be decoded with API calls
 * @param privateData Private session data, only accessible by calling `getUserSession` or `requireUserSession` on the server
 */
export async function setUserSession (event: H3Event, publicData: PublicSessionData, privateData: PrivateSessionData) {
  const session = await _useSession(event)

  await session.update(defu(Object.assign(privateData, { public: publicData }), session.data))

  return session.data
}

/**
 * Replace a user session
 * @param event
 * @param publicData User session data, please only store public information since it can be decoded with API calls
 * @param privateData Private session data, only accessible by calling `getUserSession` or `requireUserSession` on the server
 */
export async function replaceUserSession (event: H3Event, publicData: PublicSessionData, privateData: PrivateSessionData) {
  const session = await _useSession(event)

  await session.clear()
  await session.update(Object.assign(privateData, { public: publicData }))

  return session.data
}

export async function clearUserSession (event: H3Event) {
  const session = await _useSession(event)

  await sessionHooks.callHookParallel('clear', session.data, event)
  await session.clear()

  return true
}

export async function requireUserSession(event: H3Event): Promise<ActiveUserSession> {
  const userSession = await getUserSession(event) || { public: {}}

  if (!userSession.public.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  return userSession as ActiveUserSession
}

let sessionConfig: SessionConfig

function _useSession (event: H3Event) {
  if (!sessionConfig) {
    // @ts-ignore
    sessionConfig = defu({ password: process.env.NUXT_SESSION_PASSWORD }, useRuntimeConfig(event).session)
  }
  return useSession<UserSession>(event, sessionConfig)
}
