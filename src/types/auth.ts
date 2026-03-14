export type UserSession = {
  login: string
  displayName: string
}

export type LoginPayload = {
  username: string
  password: string
}

export type SessionInfoResponse = {
  user?: {
    login?: string
    name?: string
  }
}