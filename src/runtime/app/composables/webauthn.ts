import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, VerifiedAuthenticationResponse, VerifiedRegistrationResponse } from '@simplewebauthn/server'
import { ref, onMounted } from '#imports'
import type { WebAuthnComposable, WebAuthnUser } from '#auth-utils'

interface RegistrationInitResponse {
  creationOptions: PublicKeyCredentialCreationOptionsJSON
  attemptId: string
}

interface AuthenticationInitResponse {
  requestOptions: PublicKeyCredentialRequestOptionsJSON
  attemptId: string
}

export function useWebAuthn(options: {
  /**
   * The endpoint to register a new credential.
   * @default '/api/webauthn/register'
   */
  registerEndpoint?: string
  /**
   * The endpoint to authenticate a user.
   * @default '/api/webauthn/authenticate'
   */
  authenticateEndpoint?: string
  /**
   * Enable browser autofill for authentication
   * @default false
   */
  useBrowserAutofill?: boolean
} = {}): WebAuthnComposable {
  const {
    registerEndpoint = '/api/webauthn/register',
    authenticateEndpoint = '/api/webauthn/authenticate',
    useBrowserAutofill = false,
  } = options

  async function register(user: WebAuthnUser) {
    const { creationOptions, attemptId } = await $fetch<RegistrationInitResponse>(registerEndpoint, {
      method: 'POST',
      body: {
        user,
        verify: false,
      },
    })

    const attestationResponse = await startRegistration({
      optionsJSON: creationOptions,
    })
    const verificationResponse = await $fetch<VerifiedRegistrationResponse>(registerEndpoint, {
      method: 'POST',
      body: {
        user,
        attemptId,
        response: attestationResponse,
        verify: true,
      },
    })

    return verificationResponse && verificationResponse.verified
  }

  async function authenticate(userName?: string) {
    const { requestOptions, attemptId } = await $fetch<AuthenticationInitResponse>(authenticateEndpoint, {
      method: 'POST',
      body: {
        verify: false,
        userName,
      },
    })

    const assertionResponse = await startAuthentication({
      optionsJSON: requestOptions,
      useBrowserAutofill,
    })
    const verificationResponse = await $fetch<VerifiedAuthenticationResponse>(authenticateEndpoint, {
      method: 'POST',
      body: {
        attemptId,
        userName,
        response: assertionResponse,
        verify: true,
      },
    })

    return verificationResponse && verificationResponse.verified
  }
  const isSupported = ref(false)
  onMounted(() => {
    isSupported.value = browserSupportsWebAuthn()
  })

  return {
    register,
    authenticate,
    isSupported,
    isAutofillSupported: browserSupportsWebAuthnAutofill,
    isPlatformAvailable: platformAuthenticatorIsAvailable,
  }
}
