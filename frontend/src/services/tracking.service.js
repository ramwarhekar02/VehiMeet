import { apiClient } from '../api/client'

export const trackingService = {
  createLocation: (payload, token) => apiClient.post('/tracking/location', payload, token),
  getLiveBookingTracking: (bookingId, token) =>
    apiClient.get(`/tracking/booking/${bookingId}/live`, token),
  getBookingTrackingHistory: (bookingId, token) =>
    apiClient.get(`/tracking/booking/${bookingId}/history`, token),
}
