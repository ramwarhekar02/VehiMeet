import { Navigate, useLocation } from 'react-router-dom'
import { roleHomeMap } from '../contexts/auth-context'
import { useAuth } from '../contexts/useAuth'

export const ProtectedRoute = ({ allow, children }) => {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/?auth=login&redirect=${redirect}`} replace />
  }

  if (allow && !allow.includes(user?.role)) {
    return <Navigate to={roleHomeMap[user?.role] || '/'} replace />
  }

  return children
}
