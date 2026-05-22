import { apiClient } from '../api/client'

export const kycService = {
  getSessionById: (sessionId, token) => apiClient.get(`/kyc/session/${sessionId}`, token),
  startSession: (sessionId, payload, token) =>
    apiClient.post(`/kyc/session/${sessionId}/start`, payload, token),
  completeSession: (sessionId, payload, token) =>
    apiClient.post(`/kyc/session/${sessionId}/complete`, payload, token),
}
