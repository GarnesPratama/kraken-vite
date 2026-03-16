import { axelorJson, axelorRequest } from '@/services/http/axelor-http'
import type { LoginPayload, SessionInfoResponse, UserSession } from '@/types/auth'


export async function loginWithPassword(payload: LoginPayload): Promise<UserSession> {
  const username = payload.username.trim()
  const password = payload.password.trim()

  if (!username || !password) {
    throw new Error('Username dan password wajib diisi')
  }

  const loginResponse = await axelorRequest('callback', {
    method: 'POST',
    jsonBody: { username, password },
  })

  if (!loginResponse.ok) {
    throw new Error('Login gagal, cek username/password atau sesi backend')
  }

  const session = await axelorJson<SessionInfoResponse>('ws/public/app/info')

  return {
    login: session.user?.login ?? username,
    displayName: session.user?.name ?? session.user?.login ?? username,
  }
}

export async function logoutSession() {
  await axelorRequest('logout', { method: 'GET' })
}
