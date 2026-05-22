import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { useAuth } from '../../contexts/useAuth'
import { useResource } from '../../hooks/useResource'
import { useBookingSubscription, useRealtimeEvent } from '../../contexts/useSocket'
import { customerService } from '../../services/customer.service'
import { vehicleService } from '../../services/vehicle.service'
import { trackingService } from '../../services/tracking.service'
import { EmptyState } from '../../components/common/EmptyState'
import { InlineMessage } from '../../components/common/InlineMessage'
import { SectionCard } from '../../components/common/SectionCard'
import { StatusBadge } from '../../components/common/StatusBadge'
import { KeyStatCard } from '../../components/dashboard/KeyStatCard'
import { TrackingHistoryItem } from '../../components/tracking/TrackingHistoryItem'
import { RoutePlanner } from '../../components/booking/RoutePlanner'

const useCustomerProfile = (token) => useResource(() => customerService.getProfile(token), [token])
const useCustomerBookings = (token) => useResource(() => customerService.getBookings(token), [token])

const createTrackingMarkerIcon = (label) =>
  L.divIcon({
    className: 'tracking-map-marker',
    html: `<span>${label}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

const pickupIcon = createTrackingMarkerIcon('P')
const dropIcon = createTrackingMarkerIcon('D')
const partnerIcon = createTrackingMarkerIcon('Ride')

const RideTrackingMap = ({ booking, liveLocation }) => {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const partnerMarkerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !booking) {
      return undefined
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([booking.pickup.lat, booking.pickup.lng], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    L.marker([booking.pickup.lat, booking.pickup.lng], { icon: pickupIcon }).addTo(map)
    L.marker([booking.drop.lat, booking.drop.lng], { icon: dropIcon }).addTo(map)
    L.polyline(
      [
        [booking.pickup.lat, booking.pickup.lng],
        [booking.drop.lat, booking.drop.lng],
      ],
      {
        color: '#111111',
        weight: 4,
        opacity: 0.7,
        dashArray: '8 8',
      },
    ).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      partnerMarkerRef.current = null
    }
  }, [booking])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !booking) {
      return
    }

    const points = [
      [booking.pickup.lat, booking.pickup.lng],
      [booking.drop.lat, booking.drop.lng],
    ]

    const displayLocation = liveLocation?.snappedLocation || liveLocation?.location
    if (displayLocation?.lat && displayLocation?.lng) {
      const partnerPoint = [displayLocation.lat, displayLocation.lng]
      points.push(partnerPoint)

      if (!partnerMarkerRef.current) {
        partnerMarkerRef.current = L.marker(partnerPoint, { icon: partnerIcon }).addTo(map)
      } else {
        partnerMarkerRef.current.setLatLng(partnerPoint)
      }
    }

    map.fitBounds(points, { padding: [30, 30] })
  }, [booking, liveLocation])

  return <div ref={containerRef} className='h-[320px] w-full overflow-hidden rounded-[26px] border border-black/10' />
}

const getCustomerFlowCopy = (status) => {
  switch (status) {
    case 'PENDING_ASSIGNMENT':
      return {
        label: 'Awaiting dispatch',
        detail: 'Admin has received your booking and is matching it with an approved partner.',
      }
    case 'ASSIGNED':
      return {
        label: 'Partner assigned',
        detail: 'A partner has been dispatched. Waiting for the ride request to be accepted.',
      }
    case 'PARTNER_EN_ROUTE':
      return {
        label: 'En route',
        detail: 'Your partner is on the way. Live tracking is active now.',
      }
    case 'ARRIVED':
      return {
        label: 'Partner arrived',
        detail: 'Your partner has reached pickup. The trip will start once you are onboard.',
      }
    case 'TRIP_STARTED':
      return {
        label: 'Trip in progress',
        detail: 'Your ride is active and moving toward the destination.',
      }
    case 'TRIP_COMPLETED':
      return {
        label: 'Trip completed',
        detail: 'This ride has been completed successfully.',
      }
    case 'CANCELLED_BY_USER':
    case 'CANCELLED_BY_PARTNER':
    case 'CANCELLED_BY_ADMIN':
      return {
        label: 'Booking cancelled',
        detail: 'This booking is no longer active.',
      }
    default:
      return {
        label: 'Booking active',
        detail: 'Your ride is moving through the booking workflow.',
      }
  }
}

const formatEta = (seconds) => {
  if (!seconds && seconds !== 0) {
    return '--'
  }
  const minutes = Math.max(1, Math.round(Number(seconds) / 60))
  return `${minutes} min`
}

export const CustomerDashboardPage = () => {
  const { token, user } = useAuth()
  const profileState = useCustomerProfile(token)
  const bookingsState = useCustomerBookings(token)

  const summary = useMemo(() => {
    const bookings = bookingsState.data ?? []
    return {
      totalBookings: bookings.length,
      activeBookings: bookings.filter((item) => !String(item.status).includes('CANCELLED') && item.status !== 'TRIP_COMPLETED').length,
      savedAddresses: profileState.data?.profile?.defaultPickupAddresses?.length ?? 0,
    }
  }, [bookingsState.data, profileState.data])

  return (
    <div className='bg-white text-black'>
      <section className='bg-black px-4 py-10 text-white sm:py-12 md:px-8 md:py-18'>
        <div className='mx-auto max-w-7xl'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-white/55'>Customer Dashboard</p>
          <div className='mt-5 grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-end'>
            <div>
              <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'>
                Welcome back, {user?.fullName}. Book, track, and manage your next ride.
              </h1>
              <p className='mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base'>
                Your ride flow is now direct: choose an approved vehicle, create a booking, and track the trip once a verified partner is assigned.
              </p>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <Link className='rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black' to='/vehicles'>
                Browse vehicles
              </Link>
              <Link className='rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black' to='/dashboard/bookings'>
                Open bookings
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className='mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-14'>
        <div className='grid gap-4 md:grid-cols-4'>
          <KeyStatCard label='Total bookings' value={summary.totalBookings} />
          <KeyStatCard label='Open workflows' value={summary.activeBookings} />
          <KeyStatCard label='Saved addresses' value={summary.savedAddresses} />
          <KeyStatCard label='Profile status' value='Ready to book' />
        </div>

        <div className='mt-8 rounded-[24px] border border-black/10 bg-neutral-50 p-5 sm:rounded-[30px] sm:p-6'>
          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Dashboard focus</p>
          <h2 className='mt-2 text-2xl font-semibold text-black'>Everything active in one glance</h2>
          <p className='mt-3 max-w-2xl text-sm leading-7 text-neutral-600'>
            Use the bookings section to create rides, see route previews, and manage your ride queue. This dashboard stays focused on your overall customer activity.
          </p>
          <div className='mt-6 flex flex-wrap gap-3'>
            <Link className='rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800' to='/dashboard/bookings'>
              Open bookings workspace
            </Link>
            <Link className='rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white' to='/dashboard/profile'>
              View profile
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export const CustomerBookingsPage = () => {
  const { token } = useAuth()
  const vehiclesState = useResource(() => vehicleService.getVehicles(), [])
  const { data, error, loading, reload } = useCustomerBookings(token)
  const [form, setForm] = useState({
    vehicleId: '',
    pickupAddress: 'Nagpur, Maharashtra, India',
    pickupLocation: {
      lat: 21.1458,
      lng: 79.0882,
    },
    dropAddress: '',
    dropLocation: null,
    estimatedDistanceKm: 0,
    estimatedDurationMin: 0,
  })
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const reloadBookings = useCallback(() => reload(), [reload])

  useRealtimeEvent('booking:created', reloadBookings)
  useRealtimeEvent('booking:updated', reloadBookings)

  const handleCreateBooking = async (event) => {
    event.preventDefault()
    setFeedback('')
    setActionError('')
    try {
      if (!form.pickupAddress || !form.dropAddress || !form.pickupLocation || !form.dropLocation) {
        throw new Error('Select both pickup and dropoff locations from the map planner before creating a booking.')
      }

      const payload = {
        vehicleId: form.vehicleId,
        pickup: {
          address: form.pickupAddress,
          lat: Number(form.pickupLocation?.lat),
          lng: Number(form.pickupLocation?.lng),
        },
        drop: {
          address: form.dropAddress,
          lat: Number(form.dropLocation?.lat),
          lng: Number(form.dropLocation?.lng),
        },
        estimatedDistanceKm: Number(form.estimatedDistanceKm),
        estimatedDurationMin: Number(form.estimatedDurationMin),
      }
      await customerService.createBooking(payload, token)
      setFeedback('Booking created successfully. We will now look for an approved partner and vehicle match.')
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleRoutePlannerChange = (partial) => {
    setForm((current) => {
      const next = { ...current, ...partial }
      const changed = Object.keys(partial).some((key) => current[key] !== next[key])
      return changed ? next : current
    })
  }

  const selectedVehicle = useMemo(
    () => (vehiclesState.data ?? []).find((vehicle) => vehicle.id === form.vehicleId),
    [form.vehicleId, vehiclesState.data],
  )
  const bookingSteps = [
    {
      label: 'Route',
      done: Boolean(form.pickupLocation && form.dropLocation),
    },
    {
      label: 'Ride',
      done: Boolean(form.vehicleId),
    },
    {
      label: 'Confirm',
      done: Boolean(form.vehicleId && form.pickupLocation && form.dropLocation),
    },
  ]

  return (
    <div className='space-y-6'>
      <SectionCard title='Book a ride' subtitle='A faster step-by-step flow for route, ride class, and final confirmation.'>
        <form className='grid gap-5 xl:grid-cols-[1fr,360px]' onSubmit={handleCreateBooking}>
          <div className='space-y-5'>
            <div className='grid gap-3 sm:grid-cols-3'>
              {bookingSteps.map((step, index) => (
                <div
                  key={step.label}
                  className={`rounded-[22px] border p-4 transition ${
                    step.done
                      ? 'border-emerald-500/30 bg-emerald-50 text-black'
                      : 'border-black/10 bg-neutral-50 text-neutral-500'
                  }`}
                >
                  <p className='text-xs font-semibold uppercase tracking-[0.18em]'>Step {index + 1}</p>
                  <p className='mt-2 text-lg font-semibold'>{step.label}</p>
                </div>
              ))}
            </div>

            <div className='rounded-[30px] border border-black/10 bg-white p-4 sm:p-5'>
              <RoutePlanner value={form} onChange={handleRoutePlannerChange} />
            </div>

            <div className='rounded-[30px] border border-black/10 bg-neutral-50 p-4 sm:p-5'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Ride selection</p>
                  <h3 className='mt-2 text-2xl font-semibold text-black'>Choose your vehicle</h3>
                </div>
                <select
                  className='min-h-12 w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black outline-none transition focus:border-emerald-500 sm:w-auto'
                  value={form.vehicleId}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                >
                  <option value=''>Select vehicle</option>
                  {(vehiclesState.data ?? []).map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model} | {vehicle.category?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='mt-4 grid gap-3 md:grid-cols-2'>
                {(vehiclesState.data ?? []).slice(0, 4).map((vehicle) => {
                  const active = vehicle.id === form.vehicleId
                  return (
                    <button
                      key={vehicle.id}
                      type='button'
                      onClick={() => setForm({ ...form, vehicleId: vehicle.id })}
                      className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-1 ${
                        active ? 'border-emerald-500 bg-white shadow-[0_18px_45px_rgba(16,185,129,0.16)]' : 'border-black/10 bg-white'
                      }`}
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-lg font-semibold text-black'>{vehicle.brand} {vehicle.model}</p>
                          <p className='mt-1 text-sm text-neutral-500'>{vehicle.category?.name || 'Ride'} | {vehicle.seats || '--'} seats</p>
                        </div>
                        <span className='rounded-full bg-black px-3 py-1 text-xs font-semibold text-white'>Rs. {vehicle.category?.baseFare ?? '--'}</span>
                      </div>
                      <p className='mt-3 text-xs uppercase tracking-[0.16em] text-neutral-400'>
                        Rs. {vehicle.category?.perKmRate ?? '--'}/km | Rs. {vehicle.category?.perMinuteRate ?? '--'}/min
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <aside className='xl:sticky xl:top-28 xl:self-start'>
            <div className='surface-card rounded-[32px] p-5'>
              <p className='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600'>Trip summary</p>
              <h3 className='mt-2 text-2xl font-semibold text-black'>Review and confirm</h3>
              <div className='mt-5 space-y-3 text-sm'>
                <div className='rounded-[22px] bg-neutral-50 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Pickup</p>
                  <p className='mt-2 font-medium text-black'>{form.pickupAddress || 'Choose pickup'}</p>
                </div>
                <div className='rounded-[22px] bg-neutral-50 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Dropoff</p>
                  <p className='mt-2 font-medium text-black'>{form.dropAddress || 'Choose dropoff'}</p>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='rounded-[22px] bg-neutral-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Distance</p>
                    <p className='mt-2 font-semibold text-black'>{form.estimatedDistanceKm ? `${form.estimatedDistanceKm} km` : '--'}</p>
                  </div>
                  <div className='rounded-[22px] bg-neutral-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Time</p>
                    <p className='mt-2 font-semibold text-black'>{form.estimatedDurationMin ? `${form.estimatedDurationMin} min` : '--'}</p>
                  </div>
                </div>
                <div className='rounded-[22px] bg-black p-4 text-white'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/50'>Selected ride</p>
                  <p className='mt-2 text-lg font-semibold'>{selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'No vehicle selected'}</p>
                  <p className='mt-1 text-sm text-white/65'>{selectedVehicle?.category?.name || 'Choose a ride to continue'}</p>
                </div>
              </div>
              <div className='mt-5'>
                <InlineMessage variant='error' text={actionError || error} />
                <InlineMessage text={feedback} />
              </div>
              <button type='submit' className='button-primary mt-4 min-h-12 w-full'>Confirm booking</button>
            </div>
          </aside>
        </form>
      </SectionCard>

      <SectionCard title='Recent bookings' subtitle='Your latest ride activity.' actions={<button className='button-secondary' onClick={reload} type='button'>View all</button>}>
        {loading ? <p className='text-sm text-slate-400'>Loading bookings...</p> : null}
        <div className='space-y-4'>
          {(data ?? []).map((booking) => (
            <div key={booking.id} className='panel-muted p-5'>
              <div className='mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300'>
                <p className='font-semibold text-white'>{getCustomerFlowCopy(booking.status).label}</p>
                <p className='mt-1 text-slate-400'>{getCustomerFlowCopy(booking.status).detail}</p>
              </div>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='font-semibold text-white'>{booking.bookingCode}</p>
                  <p className='text-sm text-slate-400'>{booking.pickup.address} to {booking.drop.address}</p>
                </div>
                <StatusBadge value={booking.status} />
              </div>
              <div className='mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-2'>
                <p>Estimated fare: Rs. {booking.pricing.totalEstimatedFare}</p>
                <p>Assignment: {booking.status}</p>
                <p>Vehicle: {booking.vehicleSnapshot.brand} {booking.vehicleSnapshot.model}</p>
                <p>Partner: {booking.partner?.fullName || 'Awaiting assignment'}</p>
              </div>
              <div className='mt-4 flex flex-wrap gap-3'>
                <Link className='button-secondary' to={`/dashboard/bookings/${booking.id}`}>Details</Link>
                <Link className='button-secondary' to={`/dashboard/track/${booking.id}`}>Track</Link>
              </div>
            </div>
          ))}
        </div>
        {!loading && !(data ?? []).length ? (
          <div className='mt-4'>
            <EmptyState title='No bookings yet' message='Create your first booking from this bookings workspace.' />
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

export const CustomerBookingDetailPage = () => {
  const navigate = useNavigate()
  const { token, showToast } = useAuth()
  const { id } = useParams()
  const { data, error, reload } = useResource(() => customerService.getBookingById(id, token), [id, token])
  const [feedback, setFeedback] = useState('')
  const reloadMatchingBooking = useCallback(
    (message) => {
      if (message?.payload?.bookingId === id) {
        reload()
      }
    },
    [id, reload],
  )

  useBookingSubscription(id)
  useRealtimeEvent('booking:updated', reloadMatchingBooking)

  const cancelBooking = async () => {
    try {
      await customerService.cancelBooking(id, { reason: 'Cancelled from customer detail page' }, token)
      showToast('Ride cancelled successfully.')
      navigate('/dashboard/bookings', { replace: true })
    } catch (err) {
      setFeedback(err.message)
    }
  }

  if (!data && !error) {
    return <SectionCard title='Loading booking details...' />
  }

  return (
    <SectionCard title={data?.bookingCode || 'Booking detail'} subtitle='Booking data, lifecycle state, partner assignment, and ride tracking.' actions={<button className='button-secondary' onClick={cancelBooking} type='button'>Cancel booking</button>}>
      <InlineMessage variant={error ? 'error' : 'info'} text={error || feedback} />
      {data ? (
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='panel-muted p-5 text-sm text-slate-300'>
            <div className='flex items-center justify-between gap-3'>
              <h3 className='text-lg font-semibold text-white'>Trip detail</h3>
              <StatusBadge value={data.status} />
            </div>
            <div className='mt-4 space-y-2'>
              <p>Pickup: {data.pickup.address}</p>
              <p>Drop: {data.drop.address}</p>
              <p>Distance: {data.routeInfo.estimatedDistanceKm} km</p>
              <p>Duration: {data.routeInfo.estimatedDurationMin} min</p>
              <p>Estimated fare: Rs. {data.pricing.totalEstimatedFare}</p>
            </div>
          </div>
          <div className='panel-muted p-5 text-sm text-slate-300'>
            <h3 className='text-lg font-semibold text-white'>Workflow links</h3>
            <div className='mt-4 flex flex-wrap gap-3'>
              <Link className='button-secondary' to={`/dashboard/track/${data.id}`}>Track booking</Link>
            </div>
            <div className='mt-4 space-y-2'>
              <p>Flow stage: {getCustomerFlowCopy(data.status).label}</p>
              <p>Status code: {data.status}</p>
              <p>Partner: {data.partner?.fullName || 'Awaiting assignment'}</p>
              <p>Vehicle: {data.vehicleSnapshot.brand} {data.vehicleSnapshot.model}</p>
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}

export const CustomerTrackPage = () => {
  const { token } = useAuth()
  const { bookingId } = useParams()
  const booking = useResource(() => customerService.getBookingById(bookingId, token), [bookingId, token])
  const live = useResource(() => trackingService.getLiveBookingTracking(bookingId, token), [bookingId, token])
  const history = useResource(() => trackingService.getBookingTrackingHistory(bookingId, token), [bookingId, token])
  const stage = getCustomerFlowCopy(booking.data?.status)
  const hasLiveLocation = Boolean(live.data?.location)
  const reloadTracking = useCallback(
    (message) => {
      if (message?.payload?.bookingId === bookingId) {
        live.reload()
        history.reload()
      }
    },
    [bookingId, history, live],
  )
  const reloadBooking = useCallback(
    (message) => {
      if (message?.payload?.bookingId === bookingId) {
        booking.reload()
      }
    },
    [booking, bookingId],
  )

  useBookingSubscription(bookingId)
  useRealtimeEvent('tracking:location', reloadTracking)
  useRealtimeEvent('booking:updated', reloadBooking)

  return (
    <div className='space-y-6'>
      <SectionCard title='Live tracking' subtitle='Current partner coordinates, route status, and movement history.'>
        <InlineMessage variant='error' text={booking.error || live.error || history.error} />
        <div className='mb-4 rounded-2xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100'>
          <p className='font-semibold'>{stage.label}</p>
          <p className='mt-1'>
            {hasLiveLocation ? stage.detail : booking.data?.status === 'PENDING_ASSIGNMENT' || booking.data?.status === 'ASSIGNED'
              ? 'Live map will start once the dispatched partner accepts the ride and begins moving toward pickup.'
              : stage.detail}
          </p>
        </div>
        {booking.data ? (
          <div className='mb-5'>
            <RideTrackingMap booking={booking.data} liveLocation={live.data} />
          </div>
        ) : null}
        <div className='grid gap-3 sm:grid-cols-2 md:grid-cols-3'>
          <KeyStatCard label='Current latitude' value={live.data?.location?.lat ?? '--'} />
          <KeyStatCard label='Current longitude' value={live.data?.location?.lng ?? '--'} />
          <KeyStatCard label='Current speed' value={live.data?.speed ? `${live.data.speed} km/h` : '--'} />
          <KeyStatCard label='ETA' value={formatEta(live.data?.etaSeconds)} />
          <KeyStatCard label='Remaining' value={live.data?.distanceRemainingKm ? `${live.data.distanceRemainingKm} km` : '--'} />
          <KeyStatCard label='Route source' value={live.data?.routeProvider || '--'} />
        </div>
      </SectionCard>
      <SectionCard title='Tracking history' subtitle='Validated location updates emitted by the partner workflow.'>
        {(history.data ?? []).length ? (
          <div className='space-y-3'>
            {(history.data ?? []).map((entry) => (
              <TrackingHistoryItem key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className='rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-5 text-sm text-slate-400'>
            No live movement updates yet. This stays empty while the booking is still awaiting dispatch or acceptance.
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export const CustomerProfilePage = () => {
  const { token } = useAuth()
  const { data, error, reload } = useCustomerProfile(token)
  const [feedback, setFeedback] = useState('')
  const [form, setForm] = useState(null)

  const currentForm = form || {
    fullName: data?.user?.fullName || '',
    phone: data?.user?.phone || '',
    emergencyContact: data?.profile?.emergencyContact || '',
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    try {
      await customerService.updateProfile(currentForm, token)
      setFeedback('Customer profile updated.')
      reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  return (
    <SectionCard title='Customer profile' subtitle='Personal details, emergency contact, and basic ride preferences.'>
      <InlineMessage variant='error' text={error} />
      <InlineMessage text={feedback} />
      <form className='grid gap-4 md:grid-cols-2' onSubmit={saveProfile}>
        <input className='input-shell' value={currentForm.fullName} onChange={(e) => setForm({ ...currentForm, fullName: e.target.value })} />
        <input className='input-shell' value={currentForm.phone} onChange={(e) => setForm({ ...currentForm, phone: e.target.value })} />
        <input className='input-shell md:col-span-2' value={currentForm.emergencyContact} onChange={(e) => setForm({ ...currentForm, emergencyContact: e.target.value })} placeholder='Emergency contact' />
        <button className='button-primary md:col-span-2' type='submit'>Save profile</button>
      </form>
      {data?.profile ? (
        <div className='mt-6 grid gap-4 md:grid-cols-2'>
          <KeyStatCard label='Saved pickup addresses' value={data.profile.defaultPickupAddresses?.length ?? 0} />
          <KeyStatCard label='Emergency contact set' value={data.profile.emergencyContact?.phone ? 'Yes' : 'No'} />
        </div>
      ) : null}
    </SectionCard>
  )
}
