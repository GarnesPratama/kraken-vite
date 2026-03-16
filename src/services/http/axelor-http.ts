const CSRF_COOKIE_NAME = 'CSRF-TOKEN'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

export type AxelorRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | null
  jsonBody?: unknown
}

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`))
  return match ? decodeURIComponent(match[3]) : null
}

function toAbsolutePath(path: string) {
  if (path.startsWith('/')) {
    return path
  }
  return `/${path}`
}

export async function axelorRequest(path: string, init: AxelorRequestInit = {}) {
  const token = readCookie(CSRF_COOKIE_NAME)
  const headers = new Headers(init.headers)

  headers.set('Accept', 'application/json')
  if (token) {
    headers.set(CSRF_HEADER_NAME, token)
  }

  let body = init.body

  if (init.jsonBody !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.jsonBody)
  }

  return fetch(toAbsolutePath(path), {
    ...init,
    headers,
    body,
    credentials: 'include',
  })
}

export async function axelorJson<T>(path: string, init: AxelorRequestInit = {}) {
  const response = await axelorRequest(path, init)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} at ${path}`)
  }

  return (await response.json()) as T
}
