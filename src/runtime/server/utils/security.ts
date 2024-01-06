import { type H3Event, setCookie, getCookie, getQuery, createError } from 'h3'
import { subtle, getRandomValues } from 'uncrypto'
import { useRuntimeConfig } from '#imports'

export type OAuthChecks = 'pkce' | 'state'

// From oauth4webapi https://github.com/panva/oauth4webapi/blob/4b46a7b4a4ca77a513774c94b718592fe3ad576f/src/index.ts#L567C1-L579C2 
const CHUNK_SIZE = 0x8000
export function encodeBase64Url(input: Uint8Array | ArrayBuffer) {
  if (input instanceof ArrayBuffer) {
    input = new Uint8Array(input)
  }

  const arr = []
  for (let i = 0; i < input.byteLength; i += CHUNK_SIZE) {
    // @ts-expect-error
    arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)))
  }
  return btoa(arr.join('')).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function randomBytes() {
  return encodeBase64Url(getRandomValues(new Uint8Array(32)))
}

/** 
 * Generate a random `code_verifier` for use in the PKCE flow
 * @see https://tools.ietf.org/html/rfc7636#section-4.1
 */
export function generateCodeVerifier() {
  return randomBytes()
}

/** 
 * Generate a random `state` used to prevent CSRF attacks 
 * @see https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.1
 */
export function generateState() {
  return randomBytes()
}

/**
 * Generate a `code_challenge` from a `code_verifier` for use in the PKCE flow
 * @param verifier `code_verifier` string
 * @returns `code_challenge` string
 * @see https://tools.ietf.org/html/rfc7636#section-4.1
 */
export async function pkceCodeChallenge(verifier: string) {
  return encodeBase64Url(await subtle.digest({ name: 'SHA-256' }, new TextEncoder().encode(verifier)))
}

interface CheckUseResult {
  code_verifier?: string
}
/**
 * Checks for PKCE and state
 */
export const checks = {
  /**
   * Create checks
   * @param event, H3Event
   * @param checks, OAuthChecks[] a list of checks to create
   * @returns Record<string, string> a map of check parameters to add to the authorization URL
   */
  async create(event: H3Event, checks?: OAuthChecks[]) {
    const res: Record<string, string> = {}
    const runtimeConfig = useRuntimeConfig()
    if (checks?.includes('pkce')) {
      const pkceVerifier = generateCodeVerifier()
      const pkceChallenge = await pkceCodeChallenge(pkceVerifier)
      res['code_challenge'] = pkceChallenge
      res['code_challenge_method'] = 'S256'
      setCookie(event, 'nuxt-auth-util-verifier', pkceVerifier, runtimeConfig.nuxtAuthUtils.security.cookie)
    }
    if (checks?.includes('state')) {
      res['state'] = generateState()
      setCookie(event, 'nuxt-auth-util-state', res['state'], runtimeConfig.nuxtAuthUtils.security.cookie)
    }
    return res
  },
  /**
   * Use checks, verifying and returning the results
   * @param event, H3Event
   * @param checks, OAuthChecks[] a list of checks to use
   * @returns CheckUseResult a map that can contain `code_verifier` if `pkce` was used to be used in the token exchange
   */
  async use(event: H3Event, checks?: OAuthChecks[]) : Promise<CheckUseResult> {
    const res: CheckUseResult = {}
    const { state } = getQuery(event)
    if (checks?.includes('pkce')) {
      const pkceVerifier = getCookie(event, 'nuxt-auth-util-verifier')
      setCookie(event, 'nuxt-auth-util-verifier', '', { maxAge: -1 })
      res['code_verifier'] = pkceVerifier
    }
    if (checks?.includes('state')) {
      const stateInCookie = getCookie(event, 'nuxt-auth-util-state')
      setCookie(event, 'nuxt-auth-util-state', '', { maxAge: -1 })
      if (checks?.includes('state')) {
        if (!state || !stateInCookie) {
          const error = createError({
            statusCode: 401,
            message: 'Login failed: state is missing'
          })
          throw error
        }
        if (state !== stateInCookie) {
          const error = createError({
            statusCode: 401,
            message: 'Login failed: state does not match'
          })
          throw error
        }
      }
    }
    return res
  },
}