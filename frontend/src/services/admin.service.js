import { apiClient } from '../api/client'

export const adminService = {
  getDashboard: (token) => apiClient.get('/admin/dashboard', token),
  getUsers: (token) => apiClient.get('/admin/users', token),
  getPartners: (token) => apiClient.get('/admin/partners', token),
  getBookings: (token) => apiClient.get('/admin/bookings', token),
  approvePartner: (partnerId, token) =>
    apiClient.post(`/admin/partners/${partnerId}/approve`, {}, token),
  updatePartner: (partnerId, payload, token) =>
    apiClient.patch(`/admin/partners/${partnerId}`, payload, token),
  assignBooking: (bookingId, payload, token) =>
    apiClient.post(`/admin/bookings/${bookingId}/assign`, payload, token),
  reviewKyc: (sessionId, payload, token) =>
    apiClient.post(`/admin/kyc/${sessionId}/review`, payload, token),
}
