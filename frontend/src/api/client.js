export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
export const SOCKET_BASE_URL =
  import.meta.env.VITE_SOCKET_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '')
export const SESSION_EXPIRED_EVENT = 'vehimeet:session-expired'

const buildHeaders = (token, hasJson = true) => {
  const headers = {}

  if (hasJson) {
    headers['Content-Type'] = 'application/json'
  }

  // If no token provided, try to read from localStorage (legacy STORAGE_KEY)
  if (!token) {
    try {
      const raw = localStorage.getItem('vehimeet-session')
      if (raw) {
        const parsed = JSON.parse(raw)
        token = parsed?.token || token
      }
    } catch {
      // noop
    }
  }

  // Add Authorization header if token is available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

export class ApiClientError extends Error {
  constructor(message, code, details, status) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.details = details
    this.status = status
  }
}

const request = async (path, options = {}) => {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options })
  } catch {
    throw new ApiClientError(
      `Unable to connect to the backend at ${API_BASE_URL}. Make sure the backend server is running.`,
      'NETWORK_ERROR',
      {},
      0,
    )
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.success === false) {
    if (
      response.status === 401 &&
      ['INVALID_TOKEN', 'SESSION_INVALID', 'AUTH_REQUIRED'].includes(payload.code)
    ) {
      window.dispatchEvent(
        new CustomEvent(SESSION_EXPIRED_EVENT, {
          detail: {
            message: 'Session expired. Login again.',
          },
        }),
      )
    }

    throw new ApiClientError(
      payload.message || 'Request failed',
      payload.code || 'REQUEST_FAILED',
      payload.details || {},
      response.status,
    )
  }

  return payload.data
}

export const apiClient = {
  // All calls include cookies for cookie-based auth.

  get: (path, token) =>
    request(path, {
      method: 'GET',
      headers: buildHeaders(token, false),
    }),
  post: (path, body, token) =>
    request(path, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body ?? {}),
    }),
  patch: (path, body, token) =>
    request(path, {
      method: 'PATCH',
      headers: buildHeaders(token),
      body: JSON.stringify(body ?? {}),
    }),
  put: (path, body, token) =>
    request(path, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify(body ?? {}),
    }),
}
