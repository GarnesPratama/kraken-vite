const CSRF_COOKIE_NAME = 'CSRF-TOKEN'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

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

export async function axelorRequest(path: string, init: RequestInit = {}) {
  const token = readCookie(CSRF_COOKIE_NAME)
  const headers = new Headers(init.headers)

  headers.set('Accept', 'application/json')
  if (token) {
    headers.set(CSRF_HEADER_NAME, token)
  }

  let body = init.body

  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  return fetch(toAbsolutePath(path), {
    ...init,
    headers,
    body,
    credentials: 'include',
  })
}

export async function axelorJson<T>(path: string, init: RequestInit = {}) {
  const response = await axelorRequest(path, init)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} at ${path}`)
  }

  return (await response.json()) as T
}
