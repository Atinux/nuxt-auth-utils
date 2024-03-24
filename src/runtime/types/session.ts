import type { ComputedRef, Ref } from 'vue'

export interface User {
}

export interface UserSession {
  user?: User
}

export interface ActiveUserSession extends UserSession {
  user: User
}

export interface UserSessionComposable {
  loggedIn: ComputedRef<boolean>
  user: ComputedRef<User | null>
  session: Ref<UserSession>,
  fetch: () => Promise<void>,
  clear: () => Promise<void>
}
