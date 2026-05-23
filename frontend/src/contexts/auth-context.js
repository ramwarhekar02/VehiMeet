import { createContext } from 'react'

export const TOAST_TIMEOUT_MS = 3200

export const roleHomeMap = {
  customer: '/dashboard/bookings',
  partner: '/partner/dashboard',
  admin: '/admin',
}

export const AuthContext = createContext(null)
