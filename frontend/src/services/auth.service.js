import { apiClient } from '../api/client'

export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (payload) => apiClient.post('/auth/register', payload),
  me: () => apiClient.get('/auth/me', undefined, { suppressSessionExpired: true }),
  refresh: () => apiClient.post('/auth/refresh', {}),
  logout: () => apiClient.post('/auth/logout', {})
}
