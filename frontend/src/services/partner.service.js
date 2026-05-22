import { apiClient } from '../api/client'

export const partnerService = {
  getProfile: (token) => apiClient.get('/partner/profile', token),
  updateProfile: (payload, token) => apiClient.patch('/partner/profile', payload, token),
  upsertVehicle: (payload, token) => apiClient.put('/partner/vehicle', payload, token),
  updateStatus: (payload, token) => apiClient.patch('/partner/status', payload, token),
  updateLocation: (payload, token) => apiClient.patch('/partner/location', payload, token),
  getAssignedBookings: (token) => apiClient.get('/partner/bookings/assigned', token),
  getBroadcastBookings: (token) => apiClient.get('/partner/bookings/broadcast', token),
  acceptBooking: (id, token) => apiClient.post(`/partner/bookings/${id}/accept`, {}, token),
  rejectBooking: (id, token) => apiClient.post(`/partner/bookings/${id}/reject`, {}, token),
  arriveAtPickup: (id, token) => apiClient.post(`/partner/bookings/${id}/arrive`, {}, token),
  startTrip: (id, token) => apiClient.post(`/partner/bookings/${id}/start`, {}, token),
  completeTrip: (id, token) => apiClient.post(`/partner/bookings/${id}/complete`, {}, token),
}
