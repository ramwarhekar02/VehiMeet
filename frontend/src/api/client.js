export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
export const SOCKET_BASE_URL =
  import.meta.env.VITE_SOCKET_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '')
export const SESSION_EXPIRED_EVENT = 'vehimeet:session-expired'

const buildHeaders = (_token, hasJson = true) => {
  const headers = {}

  if (hasJson) {
    headers['Content-Type'] = 'application/json'
  }

  // Cookie-based auth uses credentials: 'include' (HttpOnly cookies).
  // Do not attach Authorization header from browser JS.


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
  const { suppressSessionExpired = false, ...fetchOptions } = options
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...fetchOptions })
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
      !suppressSessionExpired &&
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

  get: (path, token, options = {}) =>
    request(path, {
      method: 'GET',
      headers: buildHeaders(token, false),
      ...options,
    }),
  post: (path, body, token, options = {}) =>
    request(path, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body ?? {}),
      ...options,
    }),
  patch: (path, body, token, options = {}) =>
    request(path, {
      method: 'PATCH',
      headers: buildHeaders(token),
      body: JSON.stringify(body ?? {}),
      ...options,
    }),
  put: (path, body, token, options = {}) =>
    request(path, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify(body ?? {}),
      ...options,
    }),
}
