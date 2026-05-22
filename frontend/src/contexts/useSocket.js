import { useContext, useEffect } from 'react'
import { SocketContext } from './socket-context'

export const useSocket = () => useContext(SocketContext)

export const useRealtimeEvent = (eventName, handler) => {
  const realtime = useSocket()

  useEffect(() => {
    if (!realtime?.socket || !eventName || !handler) {
      return undefined
    }

    realtime.socket.on(eventName, handler)
    return () => realtime.socket.off(eventName, handler)
  }, [eventName, handler, realtime?.socket])
}

export const useBookingSubscription = (bookingId) => {
  const realtime = useSocket()

  useEffect(() => {
    if (!realtime?.socket || !bookingId) {
      return undefined
    }

    realtime.socket.emit('booking:subscribe', { bookingId })

    return () => {
      realtime.socket.emit('booking:unsubscribe', { bookingId })
    }
  }, [bookingId, realtime?.socket])
}
