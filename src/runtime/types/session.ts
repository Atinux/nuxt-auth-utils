import type { ComputedRef, Ref } from 'vue'

export interface User {
}

export interface PublicSessionData {
  user?: User
}

export interface PrivateSessionData {
}

export interface UserSession extends PrivateSessionData {
  public: PublicSessionData
}

export interface ActiveUserSession extends UserSession {
  public: { 
    user: User
  }
}

export interface UserSessionComposable {
  loggedIn: ComputedRef<boolean>
  user: ComputedRef<User | null>
  session: Ref<PublicSessionData>,
  fetch: () => Promise<void>,
  clear: () => Promise<void>
}
