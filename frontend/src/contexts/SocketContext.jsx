import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_BASE_URL } from '../api/client'
import { useAuth } from './useAuth'
import { SocketContext } from './socket-context'

export const SocketProvider = ({ children }) => {
  const { token, user, showToast } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) {
      return undefined
    }

    const nextSocket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    const handleConnect = () => {
      setSocket(nextSocket)
      setConnected(true)
    }
    const handleDisconnect = () => setConnected(false)
    const handleConnectError = () => {
      setConnected(false)
    }

    nextSocket.on('connect', handleConnect)
    nextSocket.on('disconnect', handleDisconnect)
    nextSocket.on('connect_error', handleConnectError)
    nextSocket.on('realtime:ready', () => {
      if (user?.role === 'admin') {
        showToast('Realtime admin dashboard connected.')
      }
    })

    return () => {
      nextSocket.off('connect', handleConnect)
      nextSocket.off('disconnect', handleDisconnect)
      nextSocket.off('connect_error', handleConnectError)
      nextSocket.disconnect()
    }
  }, [showToast, token, user?.role])

  const value = useMemo(
    () => ({
      socket: token ? socket : null,
      connected,
      emit: (...args) => (token ? socket?.emit(...args) : undefined),
    }),
    [connected, socket, token],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
