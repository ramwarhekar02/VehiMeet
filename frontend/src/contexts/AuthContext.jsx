import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { AuthContext, roleHomeMap, TOAST_TIMEOUT_MS } from './auth-context'
import { SESSION_EXPIRED_EVENT } from '../api/client'

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [session, setSession] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      try {
        const user = await authService.me()
        if (isMounted) {
          setSession({ user })
        }
      } catch {
        if (isMounted) {
          setSession(null)
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), TOAST_TIMEOUT_MS)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    const handleSessionExpired = (event) => {
      setSession(null)
      setAuthError('')
      setToast({
        id: Date.now(),
        message: event.detail?.message || 'Session expired. Login again.',
        variant: 'error',
      })
      navigate('/', { replace: true })
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [navigate])

  const resolvePostAuthPath = (role) => {
    const redirect = new URLSearchParams(location.search).get('redirect')
    return redirect ? decodeURIComponent(redirect) : roleHomeMap[role] || '/'
  }

  const showToast = (message, variant = 'success') => {
    setToast({ id: Date.now(), message, variant })
  }

  const login = async (credentials) => {
    setAuthError('')
    await authService.login(credentials)
    const user = await authService.me()

    setSession({ user })
    showToast('Logged in successfully.')
    navigate(resolvePostAuthPath(user.role), { replace: true })
  }


  const register = async (payload) => {
    setAuthError('')
    await authService.register(payload)
    const user = await authService.me()
    setSession({ user })
    showToast('Account created and logged in successfully.')
    navigate(resolvePostAuthPath(user.role), { replace: true })
  }

  const logout = async () => {
    try {
      await authService.logout() // server clears cookie
    } catch {
      // noop
    }

    setSession(null)
    showToast('Logged out successfully.')
    navigate('/', { replace: true })
  }

  const updateSessionUser = (partialUser) => {
    setSession((current) => {
      if (!current?.user) return current
      return { ...current, user: { ...current.user, ...partialUser } }
    })
  }

  const value = {
    session,
    token: session?.user ? 'cookie' : '',
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
    isAuthReady,
    authError,
    setAuthError,
    toast,
    showToast,
    updateSessionUser,
    clearToast: () => setToast(null),
    login,
    register,
    logout,
    roleHomeMap,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
