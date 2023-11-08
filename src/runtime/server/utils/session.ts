import type { H3Event, SessionConfig } from 'h3'
import { useSession, createError } from 'h3'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { UserSession } from '#auth-utils'

export async function getUserSession (event: H3Event) {
  return (await _useSession(event)).data
}
/**
 * Set a user session
 * @param event
 * @param data User session data, please only store public information since it can be decoded with API calls
 */
export async function setUserSession (event: H3Event, data: UserSession) {
  const session = await _useSession(event)

  await session.update(defu(data, session.data))

  return session.data
}

export async function clearUserSession (event: H3Event) {
  const session = await _useSession(event)

  await session.clear()

  return true
}

export async function requireUserSession(event: H3Event) {
  const userSession = await getUserSession(event)

  if (!userSession.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  return userSession
}

let sessionConfig: SessionConfig

function _useSession (event: H3Event) {
  if (!sessionConfig) {
    // @ts-ignore
    sessionConfig = defu({ password: process.env.NUXT_SESSION_PASSWORD }, useRuntimeConfig(event).session)
  }
  return useSession<UserSession>(event, sessionConfig)
}
