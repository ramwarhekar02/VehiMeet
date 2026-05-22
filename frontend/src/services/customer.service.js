import { apiClient } from '../api/client'

export const customerService = {
  getProfile: (token) => apiClient.get('/customer/profile', token),
  updateProfile: (payload, token) => apiClient.patch('/customer/profile', payload, token),
  getBookings: (token) => apiClient.get('/customer/bookings', token),
  createBooking: (payload, token) => apiClient.post('/customer/bookings', payload, token),
  getBookingById: (id, token) => apiClient.get(`/customer/bookings/${id}`, token),
  cancelBooking: (id, payload, token) =>
    apiClient.post(`/customer/bookings/${id}/cancel`, payload, token),
}
