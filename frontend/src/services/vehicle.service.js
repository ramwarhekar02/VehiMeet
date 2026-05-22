import { apiClient } from '../api/client'

export const vehicleService = {
  getVehicles: () => apiClient.get('/vehicles'),
  getCategories: () => apiClient.get('/vehicles/categories'),
  getVehicleById: (id) => apiClient.get(`/vehicles/${id}`),
}
