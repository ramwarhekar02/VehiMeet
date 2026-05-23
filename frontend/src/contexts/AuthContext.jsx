import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { AuthContext, roleHomeMap, STORAGE_KEY, TOAST_TIMEOUT_MS } from './auth-context'
import { SESSION_EXPIRED_EVENT } from '../api/client'

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [session, setSession] = useState(null) // { user }
  const [token, setToken] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return ''
      const parsed = JSON.parse(raw)
      return parsed?.token || ''
    } catch {
      return ''
    }
  })
  const [authError, setAuthError] = useState('')
  const [toast, setToast] = useState(null)

  // Restore session from localStorage (JWT-based auth)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed?.user) setSession({ user: parsed.user })
    } catch {
      // noop
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
    const data = await authService.login(credentials) // { user, token }
    setSession({ user: data.user })
    setToken(data.token || '')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }))
    } catch {
      // noop
    }
    showToast(`Logged in successfully as ${data.user.role}.`)
    navigate(resolvePostAuthPath(data.user.role), { replace: true })
  }

  const register = async (payload) => {
    setAuthError('')
    const data = await authService.register(payload) // { user, token }
    setSession({ user: data.user })
    setToken(data.token || '')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }))
    } catch {
      // noop
    }
    showToast('Account created and logged in successfully.')
    navigate(resolvePostAuthPath(data.user.role), { replace: true })
  }

  const logout = async () => {
    try {
      await authService.logout() // server clears cookie
    } catch {
      // noop
    }

    setSession(null)
    setToken('')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // noop
    }
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
    token,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
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

