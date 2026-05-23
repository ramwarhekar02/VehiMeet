import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import { useAuth } from '../../contexts/useAuth'
import { useRealtimeEvent, useSocket } from '../../contexts/useSocket'
import { useResource } from '../../hooks/useResource'
import { partnerService } from '../../services/partner.service'
import { trackingService } from '../../services/tracking.service'
import { vehicleService } from '../../services/vehicle.service'
import { InlineMessage } from '../../components/common/InlineMessage'
import { SectionCard } from '../../components/common/SectionCard'
import { StatusBadge } from '../../components/common/StatusBadge'
import { KeyStatCard } from '../../components/dashboard/KeyStatCard'

const REQUIRED_IDENTITY_DOCS = [
  { key: 'aadhaarCard', label: 'Aadhaar Card' },
  { key: 'panCard', label: 'PAN Card' },
  { key: 'drivingLicense', label: 'Driving License' },
  { key: 'profilePhoto', label: 'Profile Photo' },
]

const HISTORY_STATUSES = ['ASSIGNED', 'PARTNER_EN_ROUTE', 'ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED_BY_PARTNER', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_USER']
const REQUIRED_VEHICLE_DOCS = [
  { key: 'registrationCertificate', label: 'Registration Certificate' },
  { key: 'insuranceCertificate', label: 'Insurance Certificate' },
  { key: 'pollutionCertificate', label: 'Pollution Certificate' },
  { key: 'vehiclePermit', label: 'Vehicle Permit' },
]

const isVisualDocument = (value) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(value || ''))

const buildDocumentDetails = (requiredDocs, details = {}, fallbackFiles = []) =>
  requiredDocs.map((doc, index) => {
    const detail = details?.[doc.key]
    const fallbackFile = fallbackFiles[index]

    return {
      key: doc.key,
      label: doc.label,
      fileName: detail?.fileName || fallbackFile || '',
      url: detail?.url || '',
      status: detail?.status || 'PENDING',
    }
  })

const formatText = (value, fallback = 'Not available') => {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return value
}

const getInitials = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'P'

const getDocumentInputValue = (doc) => doc.url || doc.fileName || ''

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read the selected file.'))
    reader.readAsDataURL(file)
  })

const getPartnerFlowCopy = (status) => {
  switch (status) {
    case 'ASSIGNED':
      return {
        title: 'Ride request',
        detail: 'Admin has dispatched this ride to you. Accept it or send it back to the dispatch queue.',
      }
    case 'PARTNER_EN_ROUTE':
      return {
        title: 'En route',
        detail: 'You accepted the ride. Keep live location updates running while heading to pickup.',
      }
    case 'ARRIVED':
      return {
        title: 'At pickup',
        detail: 'You have reached pickup. Start the trip after the customer is onboard.',
      }
    case 'TRIP_STARTED':
      return {
        title: 'Trip started',
        detail: 'The customer is onboard and the trip is in progress.',
      }
    case 'TRIP_COMPLETED':
      return {
        title: 'Trip completed',
        detail: 'This ride is finished and moved into completed history.',
      }
    default:
      return {
        title: 'Ride workflow',
        detail: 'This booking is in your active queue.',
      }
  }
}

const getBroadcastTone = (categoryName = '') => {
  const normalized = String(categoryName).toLowerCase()

  if (normalized.includes('bike')) {
    return 'from-neutral-950 via-neutral-900 to-neutral-800'
  }

  if (normalized.includes('auto')) {
    return 'from-black via-neutral-900 to-neutral-700'
  }

  return 'from-black via-neutral-950 to-neutral-800'
}

const usePartnerBroadcastBooking = (token) => {
  const [booking, setBooking] = useState(null)
  const dismissedRef = useRef('')

  useEffect(() => {
    if (!token) {
      return undefined
    }

    let mounted = true

    const load = async () => {
      try {
        const items = await partnerService.getBroadcastBookings(token)
        if (!mounted) {
          return
        }

        const nextBooking = (items ?? []).find((item) => item.id !== dismissedRef.current) || null
        setBooking(nextBooking)
      } catch {
        if (mounted) {
          setBooking(null)
        }
      }
    }

    load()
    const intervalId = window.setInterval(load, 15000)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
    }
  }, [token])

  const dismissBooking = (bookingId) => {
    dismissedRef.current = bookingId
    setBooking(null)
  }

  return { booking, dismissBooking }
}

const toDocumentPayload = (docs) =>
  Object.fromEntries(
    docs.map((doc) => {
      const rawValue = String(doc.inputValue || '').trim()
      const derivedFileName = !rawValue
        ? null
        : rawValue.startsWith('data:')
          ? `${doc.label.toLowerCase().replace(/\s+/g, '-')}.upload`
          : rawValue.split('/').filter(Boolean).pop() || rawValue

      return [
        doc.key,
        {
          label: doc.label,
          fileName: rawValue ? derivedFileName : null,
          url: rawValue || null,
          status: doc.status || 'PENDING',
        },
      ]
    }),
  )

const DocumentStatusBoard = ({ title, docs, onPreview }) => (
  <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500'>{title}</p>
    <div className='mt-3 space-y-3'>
      {docs.map((doc) => (
        <div key={doc.key} className='rounded-[18px] border border-black/10 bg-white p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='font-semibold text-black'>{doc.label}</p>
            <StatusBadge value={doc.fileName || doc.url ? doc.status : 'PENDING'} />
          </div>
          <div className='mt-2 text-sm text-neutral-600'>
            {doc.fileName || doc.url ? (
              <div className='flex flex-wrap items-center gap-2'>
                <button
                  className='rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white'
                  type='button'
                  onClick={() => onPreview(doc)}
                >
                  {isVisualDocument(doc.url || doc.fileName) ? 'Open Preview' : 'Open Document'}
                </button>
                <span className='break-all'>{doc.fileName || doc.url}</span>
              </div>
            ) : (
              <span className='font-medium text-neutral-500'>Missing</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)

const createTrackingMarkerIcon = (label) =>
  L.divIcon({
    className: 'tracking-map-marker',
    html: `<span>${label}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

const pickupIcon = createTrackingMarkerIcon('P')
const dropIcon = createTrackingMarkerIcon('D')
const partnerIcon = createTrackingMarkerIcon('You')

const RideTrackingMap = ({ booking, liveLocation }) => {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const pickupMarkerRef = useRef(null)
  const dropMarkerRef = useRef(null)
  const partnerMarkerRef = useRef(null)
  const routeLineRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([booking.pickup.lat, booking.pickup.lng], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    pickupMarkerRef.current = L.marker([booking.pickup.lat, booking.pickup.lng], { icon: pickupIcon }).addTo(map)
    dropMarkerRef.current = L.marker([booking.drop.lat, booking.drop.lng], { icon: dropIcon }).addTo(map)
    routeLineRef.current = L.polyline(
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
      pickupMarkerRef.current = null
      dropMarkerRef.current = null
      partnerMarkerRef.current = null
      routeLineRef.current = null
    }
  }, [booking.drop.lat, booking.drop.lng, booking.pickup.lat, booking.pickup.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
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
    } else if (partnerMarkerRef.current) {
      map.removeLayer(partnerMarkerRef.current)
      partnerMarkerRef.current = null
    }

    map.fitBounds(points, { padding: [30, 30] })
  }, [booking.drop.lat, booking.drop.lng, booking.pickup.lat, booking.pickup.lng, liveLocation])

  return <div ref={containerRef} className='h-[260px] w-full overflow-hidden rounded-[22px] border border-black/10 sm:h-[320px] sm:rounded-[26px]' />
}

const formatEta = (seconds) => {
  if (!seconds && seconds !== 0) {
    return '--'
  }
  const minutes = Math.max(1, Math.round(Number(seconds) / 60))
  return `${minutes} min`
}

const ActiveRideTrackingCard = ({ booking, onSendLocation, onStartAutoTracking, onStopAutoTracking, autoTracking }) => {
  const { token } = useAuth()
  const live = useResource(() => trackingService.getLiveBookingTracking(booking.id, token), [booking.id, token])
  const history = useResource(() => trackingService.getBookingTrackingHistory(booking.id, token), [booking.id, token])

  return (
    <div className='rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500'>Accepted ride</p>
          <h3 className='mt-2 text-2xl font-semibold text-black'>{booking.bookingCode}</h3>
          <p className='mt-2 text-sm text-neutral-600'>
            {formatText(booking.customer?.fullName, 'Customer')} | {booking.routeInfo?.estimatedDistanceKm ?? '--'} km | Rs. {booking.pricing?.finalFare || booking.pricing?.totalEstimatedFare || '--'}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <StatusBadge value={booking.status} />
          <button className='button-secondary' type='button' onClick={() => onSendLocation(booking.id)}>
            Send my location
          </button>
          {autoTracking ? (
            <button className='button-secondary' type='button' onClick={onStopAutoTracking}>
              Stop auto GPS
            </button>
          ) : (
            <button className='button-primary' type='button' onClick={() => onStartAutoTracking(booking.id)}>
              Start auto GPS
            </button>
          )}
        </div>
      </div>

      <div className='mt-5 grid gap-5 xl:grid-cols-[1.08fr,0.92fr]'>
        <RideTrackingMap booking={booking} liveLocation={live.data} />
        <div className='space-y-4'>
          <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Route</p>
            <div className='mt-3 space-y-4 text-sm text-neutral-700'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400'>Pickup</p>
                <p className='mt-1 font-medium text-black'>{booking.pickup.address}</p>
              </div>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400'>Drop</p>
                <p className='mt-1 font-medium text-black'>{booking.drop.address}</p>
              </div>
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Live position</p>
              <p className='mt-2 text-sm font-medium text-black'>
                {live.data?.location?.lat && live.data?.location?.lng
                  ? `${Number(live.data.location.lat).toFixed(5)}, ${Number(live.data.location.lng).toFixed(5)}`
                  : 'Waiting for first location update'}
              </p>
            </div>
            <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>History updates</p>
              <p className='mt-2 text-sm font-medium text-black'>{history.data?.length ?? 0} points</p>
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>ETA</p>
              <p className='mt-2 text-sm font-medium text-black'>{formatEta(live.data?.etaSeconds)}</p>
            </div>
            <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Remaining</p>
              <p className='mt-2 text-sm font-medium text-black'>{live.data?.distanceRemainingKm ?? '--'} km</p>
            </div>
            <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Route source</p>
              <p className='mt-2 text-sm font-medium text-black'>{live.data?.routeProvider || '--'}</p>
            </div>
          </div>
          <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4 text-sm text-neutral-600'>
            Customer tracking uses this same live data feed, so the map here matches what the customer sees for this booking.
          </div>
        </div>
      </div>
    </div>
  )
}

const PartnerBookingBroadcastPopup = ({ booking, onClose }) => {
  if (!booking) {
    return null
  }

  return (
    <div className='fixed inset-0 z-[65] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6'>
      <div className={`relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[26px] border border-white/10 bg-gradient-to-br ${getBroadcastTone(booking.vehicleSnapshot?.categoryName)} text-white shadow-[0_32px_120px_rgba(0,0,0,0.45)] sm:rounded-[34px]`}>
        <button
          className='absolute right-5 top-5 z-10 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black'
          type='button'
          onClick={() => onClose(booking.id)}
        >
          Close
        </button>
        <div className='grid gap-0 lg:grid-cols-[1.08fr,0.92fr]'>
          <div className='p-5 sm:p-7 sm:pr-6'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-white/55'>New booking posted</p>
            <h2 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>Fresh ride request is live for dispatch</h2>
            <p className='mt-3 max-w-2xl text-sm leading-7 text-white/68'>
              A customer just placed a ride request. Admin will dispatch it from the booking board, but all partners can review the route and trip value here instantly.
            </p>

            <div className='mt-6 grid gap-3 sm:grid-cols-3'>
              <div className='rounded-[22px] border border-white/10 bg-white/6 p-4'>
                <p className='text-xs uppercase tracking-[0.18em] text-white/55'>Customer</p>
                <p className='mt-2 text-lg font-semibold text-white'>{formatText(booking.customer?.fullName, 'Customer')}</p>
              </div>
              <div className='rounded-[22px] border border-white/10 bg-white/6 p-4'>
                <p className='text-xs uppercase tracking-[0.18em] text-white/55'>Estimated fare</p>
                <p className='mt-2 text-lg font-semibold text-white'>Rs. {booking.pricing?.totalEstimatedFare ?? '--'}</p>
              </div>
              <div className='rounded-[22px] border border-white/10 bg-white/6 p-4'>
                <p className='text-xs uppercase tracking-[0.18em] text-white/55'>Distance</p>
                <p className='mt-2 text-lg font-semibold text-white'>{booking.routeInfo?.estimatedDistanceKm ?? '--'} km</p>
              </div>
            </div>

            <div className='mt-6 rounded-[26px] border border-white/10 bg-black/25 p-5'>
              <div className='flex items-start gap-4'>
                <div className='flex flex-col items-center'>
                  <span className='flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold uppercase tracking-[0.14em] text-white'>Start</span>
                  <span className='my-2 h-16 w-px bg-white/15' />
                  <span className='flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold uppercase tracking-[0.14em] text-white'>End</span>
                </div>
                <div className='flex-1 space-y-6'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/50'>Pickup</p>
                    <p className='mt-2 text-base font-medium text-white'>{booking.pickup?.address}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/50'>Drop</p>
                    <p className='mt-2 text-base font-medium text-white'>{booking.drop?.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='border-t border-white/10 bg-white/6 p-5 sm:p-7 lg:border-l lg:border-t-0'>
            <div className='rounded-[28px] border border-white/10 bg-black/25 p-6'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/55'>Ride diagram</p>
                  <p className='mt-2 text-xl font-semibold text-white'>{booking.bookingCode}</p>
                </div>
                <StatusBadge value={booking.status} />
              </div>
              <div className='mt-6 rounded-[24px] border border-dashed border-white/15 bg-white/5 p-6'>
                <div className='flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-white/55'>
                  <span>Map flow</span>
                  <span>{booking.vehicleSnapshot?.categoryName || 'Ride'}</span>
                </div>
                <div className='mt-6 flex items-center justify-between gap-3'>
                  <div className='flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white'>
                    A
                  </div>
                  <div className='relative h-px flex-1 bg-white/15'>
                    <span className='absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white' />
                    <span className='absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white' />
                  </div>
                  <div className='flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white'>
                    B
                  </div>
                </div>
                <div className='mt-6 grid gap-3 text-sm text-white/78'>
                  <p><span className='font-semibold text-white'>Duration:</span> {booking.routeInfo?.estimatedDurationMin ?? '--'} min</p>
                  <p><span className='font-semibold text-white'>Vehicle:</span> {booking.vehicleSnapshot?.brand} {booking.vehicleSnapshot?.model}</p>
                  <p><span className='font-semibold text-white'>Customer email:</span> {formatText(booking.customer?.email, 'Hidden')}</p>
                </div>
              </div>
              <p className='mt-5 text-sm leading-6 text-white/65'>
                Dispatch is controlled by admin. Keep your profile approved and availability active to stay ready for assignment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const PartnerDashboardPage = () => {
  const { token, user } = useAuth()
  const profile = useResource(() => partnerService.getProfile(token), [token])
  const bookings = useResource(() => partnerService.getAssignedBookings(token), [token])
  const { booking: broadcastBooking, dismissBooking } = usePartnerBroadcastBooking(token)
  const reloadDashboard = useCallback(() => {
    profile.reload()
    bookings.reload()
  }, [bookings, profile])

  useRealtimeEvent('partner:assigned', reloadDashboard)
  useRealtimeEvent('booking:updated', reloadDashboard)
  useRealtimeEvent('partner:statusChanged', reloadDashboard)

  const stats = useMemo(() => {
    const list = bookings.data ?? []
    return {
      assigned: list.length,
      actionable: list.filter((item) => ['ASSIGNED', 'PARTNER_EN_ROUTE', 'ARRIVED', 'TRIP_STARTED'].includes(item.status)).length,
      earningsProxy: list.filter((item) => item.status === 'TRIP_COMPLETED').reduce((sum, item) => sum + (item.pricing.finalFare || 0), 0),
    }
  }, [bookings.data])

  return (
    <div className='bg-white text-black'>
      <section className='bg-black px-4 py-10 text-white sm:py-12 md:px-8 md:py-18'>
        <div className='mx-auto max-w-7xl'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-white/55'>Partner Desk</p>
          <div className='mt-5 grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-end'>
            <div>
              <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'>
                {user?.fullName}, your ride history, vehicle, and live operations start here.
              </h1>
              <p className='mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base'>
                Stay available, handle assignments quickly, update tracking, and keep the ride workflow moving without friction.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className='mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-14'>
        <div className='grid gap-4 md:grid-cols-3'>
          <KeyStatCard label='Ride records' value={stats.assigned} />
          <KeyStatCard label='Actionable now' value={stats.actionable} />
          <KeyStatCard label='Completed fare total' value={`Rs. ${stats.earningsProxy}`} />
        </div>

        <div className='mt-8 grid gap-6 xl:grid-cols-[0.9fr,1.1fr]'>
          <div className='rounded-[30px] border border-black/10 bg-neutral-50 p-6'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Current status</p>
            <h2 className='mt-2 text-2xl font-semibold text-black'>Availability and vehicle</h2>
            <div className='mt-6 flex flex-wrap items-center gap-4'>
              <StatusBadge value={profile.data?.profile?.status || 'OFFLINE'} />
              <p className='text-sm text-neutral-600'>
                Vehicle linked: {profile.data?.vehicle ? `${profile.data.vehicle.brand} ${profile.data.vehicle.model}` : 'No vehicle attached'}
              </p>
            </div>
            <div className='mt-6 flex flex-wrap gap-3'>
              <Link className='rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800' to='/partner/profile'>
                Update profile
              </Link>
              <Link className='rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white' to='/partner/vehicle'>
                View vehicle
              </Link>
            </div>
          </div>

          <div className='rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.06)]'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Recent assignments</p>
                <h2 className='mt-2 text-2xl font-semibold text-black'>Ride queue</h2>
              </div>
              <Link className='text-sm font-semibold text-black underline underline-offset-4' to='/partner/bookings'>
                Open history
              </Link>
            </div>
            <div className='mt-6 space-y-3'>
              {(bookings.data ?? []).slice(0, 4).map((booking) => (
                <div key={booking.id} className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <p className='font-semibold text-black'>{booking.bookingCode}</p>
                      <p className='mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>{getPartnerFlowCopy(booking.status).title}</p>
                      <p className='mt-1 text-sm text-neutral-500'>{booking.pickup.address} to {booking.drop.address}</p>
                    </div>
                    <StatusBadge value={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <PartnerBookingBroadcastPopup booking={broadcastBooking} onClose={dismissBooking} />
    </div>
  )
}

export const PartnerBookingsPage = () => {
  const { token, showToast } = useAuth()
  const { data, error, reload } = useResource(() => partnerService.getAssignedBookings(token), [token])
  const { booking: broadcastBooking, dismissBooking } = usePartnerBroadcastBooking(token)
  const [feedback, setFeedback] = useState('')
  const notifiedCancelledBookingsRef = useRef(new Set())
  const reloadBookings = useCallback(() => reload(), [reload])

  useRealtimeEvent('partner:assigned', reloadBookings)
  useRealtimeEvent('booking:updated', reloadBookings)
  const historyItems = useMemo(
    () => (data ?? []).filter((booking) => HISTORY_STATUSES.includes(booking.status)),
    [data],
  )

  useEffect(() => {
    const cancelledBooking = (data ?? []).find(
      (booking) =>
        String(booking.status).includes('CANCELLED') &&
        !notifiedCancelledBookingsRef.current.has(booking.id),
    )

    if (!cancelledBooking) {
      return
    }

    notifiedCancelledBookingsRef.current.add(cancelledBooking.id)
    showToast(`Booking ${cancelledBooking.bookingCode} was cancelled by the customer.`)
  }, [data, showToast])

  const performAction = async (bookingId, action) => {
    try {
      const actions = {
        accept: partnerService.acceptBooking,
        reject: partnerService.rejectBooking,
        arrive: partnerService.arriveAtPickup,
        start: partnerService.startTrip,
        complete: partnerService.completeTrip,
      }
      await actions[action](bookingId, token)
      const feedbackByAction = {
        accept: 'Ride request accepted. You are now en route.',
        reject: 'Ride request returned to the admin dispatch queue.',
        arrive: 'Arrival at pickup confirmed.',
        start: 'Trip started successfully.',
        complete: 'Trip completed successfully.',
      }
      setFeedback(feedbackByAction[action] || `Booking ${action} completed.`)
      reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  return (
    <SectionCard title='Partner history' subtitle='Past rides you handled, accepted, started, or completed.'>
      <InlineMessage variant='error' text={error} />
      <InlineMessage text={feedback} />
      <PartnerBookingBroadcastPopup booking={broadcastBooking} onClose={dismissBooking} />
      <div className='space-y-4'>
        {historyItems.length ? (
          historyItems.map((booking) => (
            <div key={booking.id} className='panel-muted p-5'>
              <div className='mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300'>
                <p className='font-semibold text-white'>{getPartnerFlowCopy(booking.status).title}</p>
                <p className='mt-1 text-slate-400'>{getPartnerFlowCopy(booking.status).detail}</p>
              </div>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='font-semibold text-white'>{booking.bookingCode}</p>
                  <p className='text-sm text-slate-400'>{booking.pickup.address} to {booking.drop.address}</p>
                  <p className='mt-2 text-xs uppercase tracking-[0.18em] text-slate-500'>
                    Customer {formatText(booking.customer?.fullName, 'Customer')} | Fare Rs. {booking.pricing?.finalFare || booking.pricing?.totalEstimatedFare || '--'}
                  </p>
                </div>
                <StatusBadge value={booking.status} />
              </div>
              <div className='mt-4 flex flex-wrap gap-3'>
                {booking.status === 'ASSIGNED' ? (
                  <>
                    <button className='button-primary' type='button' onClick={() => performAction(booking.id, 'accept')}>Accept ride</button>
                    <button className='button-secondary' type='button' onClick={() => performAction(booking.id, 'reject')}>Reject</button>
                  </>
                ) : null}
                {booking.status === 'PARTNER_EN_ROUTE' ? (
                  <>
                    <Link className='button-secondary' to='/partner/tracking'>Open tracking</Link>
                    <button className='button-primary' type='button' onClick={() => performAction(booking.id, 'arrive')}>Mark arrived</button>
                  </>
                ) : null}
                {booking.status === 'ARRIVED' ? (
                  <>
                    <Link className='button-secondary' to='/partner/tracking'>Open tracking</Link>
                    <button className='button-primary' type='button' onClick={() => performAction(booking.id, 'start')}>Start trip</button>
                  </>
                ) : null}
                {booking.status === 'TRIP_STARTED' ? (
                  <>
                    <Link className='button-secondary' to='/partner/tracking'>Open tracking</Link>
                    <button className='button-primary' type='button' onClick={() => performAction(booking.id, 'complete')}>Complete trip</button>
                  </>
                ) : null}
                {booking.status === 'TRIP_COMPLETED' ? (
                  <p className='text-sm text-slate-400'>Trip finished. This ride is now part of your completed history.</p>
                ) : null}
                {String(booking.status).includes('CANCELLED') ? (
                  <p className='text-sm text-slate-400'>This ride moved to history after cancellation.</p>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className='rounded-[24px] border border-white/10 bg-white/5 px-5 py-6 text-sm text-slate-400'>
            No ride history yet. Completed or handled trips will appear here.
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export const PartnerTrackingPage = () => {
  const { token } = useAuth()
  const realtime = useSocket()
  const bookings = useResource(() => partnerService.getAssignedBookings(token), [token])
  const { booking: broadcastBooking, dismissBooking } = usePartnerBroadcastBooking(token)
  const activeBookings = useMemo(
    () => (bookings.data ?? []).filter((booking) => ['PARTNER_EN_ROUTE', 'ARRIVED', 'TRIP_STARTED'].includes(booking.status)),
    [bookings.data],
  )
  const [form, setForm] = useState({
    bookingId: '',
    lat: 12.949,
    lng: 77.635,
    speed: 30,
    heading: 90,
    accuracy: 5,
    timestamp: new Date().toISOString(),
  })
  const [feedback, setFeedback] = useState('')
  const watchIdRef = useRef(null)
  const [autoTrackingBookingId, setAutoTrackingBookingId] = useState('')
  const selectedBookingId = activeBookings.some((booking) => booking.id === form.bookingId)
    ? form.bookingId
    : activeBookings[0]?.id || ''
  const socket = realtime?.socket
  const reloadTrackingQueue = useCallback(() => bookings.reload(), [bookings])

  useRealtimeEvent('partner:assigned', reloadTrackingQueue)
  useRealtimeEvent('booking:updated', reloadTrackingQueue)

  const sendLocationUpdate = useCallback(async (payload) => {
    if (socket?.connected) {
      const response = await new Promise((resolve) => {
        socket.emit('partner:updateLocation', payload, resolve)
      })

      if (!response?.success) {
        throw new Error(response?.message || 'Socket location update failed.')
      }
      return response.data
    }

    return partnerService.updateLocation(payload, token)
  }, [socket, token])

  const stopAutoTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setAutoTrackingBookingId('')
    setFeedback('Automatic GPS streaming stopped.')
  }, [])

  const startAutoTracking = useCallback(
    (bookingId) => {
      if (!navigator.geolocation) {
        setFeedback('Geolocation is not supported in this browser.')
        return
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }

      setAutoTrackingBookingId(bookingId)
      setFeedback('Automatic GPS streaming started. Keep this tab open while the trip is active.')
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const payload = {
            bookingId,
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
            speed: Number(((position.coords.speed || 0) * 3.6).toFixed(2)),
            heading: Number(position.coords.heading || 0),
            accuracy: Math.min(Number(position.coords.accuracy || 5), 100),
            timestamp: new Date().toISOString(),
          }
          setForm((current) => ({
            ...current,
            ...payload,
          }))
          try {
            await sendLocationUpdate(payload)
          } catch (err) {
            setFeedback(err.message)
          }
        },
        () => {
          setFeedback('Unable to stream your current location. Check browser location permission.')
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
      )
    },
    [sendLocationUpdate],
  )

  useEffect(
    () => () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    },
    [],
  )

  const submitLocation = async (event) => {
    event.preventDefault()
    try {
      await sendLocationUpdate({ ...form, bookingId: selectedBookingId, lat: Number(form.lat), lng: Number(form.lng), speed: Number(form.speed), heading: Number(form.heading), accuracy: Number(form.accuracy) })
      setFeedback('Location update accepted and validated.')
    } catch (err) {
      setFeedback(err.message)
    }
  }

  const useCurrentLocationForBooking = (bookingId) => {
    if (!navigator.geolocation) {
      setFeedback('Geolocation is not supported in this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const payload = {
            bookingId,
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
            speed: Number(((position.coords.speed || 0) * 3.6).toFixed(2)),
            heading: Number(position.coords.heading || 0),
            accuracy: Number(position.coords.accuracy || 5),
            timestamp: new Date().toISOString(),
          }
          setForm((current) => ({
            ...current,
            ...payload,
          }))
          await sendLocationUpdate(payload)
          bookings.reload()
          setFeedback('Live location shared successfully.')
        } catch (err) {
          setFeedback(err.message)
        }
      },
      () => {
        setFeedback('Unable to fetch your current location.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  return (
    <SectionCard title='Partner live tracking' subtitle='Accepted rides with their live maps, route details, and the same tracking feed visible to customers.'>
      <InlineMessage text={feedback} />
      <PartnerBookingBroadcastPopup booking={broadcastBooking} onClose={dismissBooking} />
      {!activeBookings.length ? (
        <div className='mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-400'>
          Currently no ride is accepted. Live tracking will appear here after you accept a ride.
        </div>
      ) : null}
      {activeBookings.length ? (
        <div className='mb-6 space-y-5'>
            {activeBookings.map((booking) => (
              <ActiveRideTrackingCard
                key={booking.id}
                booking={booking}
                onSendLocation={useCurrentLocationForBooking}
                onStartAutoTracking={startAutoTracking}
                onStopAutoTracking={stopAutoTracking}
                autoTracking={autoTrackingBookingId === booking.id}
              />
            ))}
        </div>
      ) : null}
      {activeBookings.length ? (
        <form className='grid gap-4 md:grid-cols-2' onSubmit={submitLocation}>
          <select className='input-shell md:col-span-2' value={selectedBookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })}>
            <option value=''>Select active booking</option>
            {activeBookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.bookingCode} | {booking.status}
              </option>
            ))}
          </select>
          <input className='input-shell' type='number' step='0.0001' value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
          <input className='input-shell' type='number' step='0.0001' value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
          <input className='input-shell' type='number' value={form.speed} onChange={(e) => setForm({ ...form, speed: e.target.value })} />
          <input className='input-shell' type='number' value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} />
          <input className='input-shell md:col-span-2' value={form.timestamp} onChange={(e) => setForm({ ...form, timestamp: e.target.value })} />
          <button className='button-primary md:col-span-2' type='submit' disabled={!selectedBookingId}>Submit location</button>
        </form>
      ) : null}
    </SectionCard>
  )
}

export const PartnerVehiclePage = () => {
  const { token } = useAuth()
  const { data, error, reload } = useResource(() => partnerService.getProfile(token), [token])
  const categories = useResource(() => vehicleService.getCategories(), [])
  const { booking: broadcastBooking, dismissBooking } = usePartnerBroadcastBooking(token)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [vehicleForm, setVehicleForm] = useState({
    categoryId: '',
    brand: '',
    model: '',
    plateNumber: '',
    seats: 4,
    fuelType: '',
    color: '',
    imageUrl: '',
  })
  const [vehicleDocumentInputs, setVehicleDocumentInputs] = useState({})
  const vehicleImage = data?.vehicle?.images?.[0] || ''
  const vehicleDocs = useMemo(
    () =>
      buildDocumentDetails(REQUIRED_VEHICLE_DOCS, data?.vehicle?.documentDetails, data?.vehicle?.documents).map((doc) => ({
        ...doc,
        inputValue: vehicleDocumentInputs[doc.key] ?? getDocumentInputValue(doc),
      })),
    [data?.vehicle?.documentDetails, data?.vehicle?.documents, vehicleDocumentInputs],
  )

  useEffect(() => {
    if (!data?.vehicle) {
      return
    }

    setVehicleForm({
      categoryId: data.vehicle.categoryId || data.vehicle.category?._id || '',
      brand: data.vehicle.brand || '',
      model: data.vehicle.model || '',
      plateNumber: data.vehicle.plateNumber || '',
      seats: data.vehicle.seats || 4,
      fuelType: data.vehicle.fuelType || '',
      color: data.vehicle.color || '',
      imageUrl: data.vehicle.images?.[0] || '',
    })
    setVehicleDocumentInputs(
      Object.fromEntries(
        buildDocumentDetails(REQUIRED_VEHICLE_DOCS, data.vehicle.documentDetails, data.vehicle.documents).map((doc) => [
          doc.key,
          getDocumentInputValue(doc),
        ]),
      ),
    )
  }, [data?.vehicle])

  useEffect(() => {
    if (!vehicleForm.categoryId && categories.data?.[0]?._id) {
      setVehicleForm((current) => ({ ...current, categoryId: categories.data[0]._id }))
    }
  }, [categories.data, vehicleForm.categoryId])

  const uploadVehicleImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setVehicleForm((current) => ({ ...current, imageUrl: dataUrl }))
      setFeedback('')
    } catch (err) {
      setFeedback(err.message)
    } finally {
      event.target.value = ''
    }
  }

  const uploadVehicleDocument = async (docKey, event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setVehicleDocumentInputs((current) => ({
        ...current,
        [docKey]: dataUrl,
      }))
      setFeedback('')
    } catch (err) {
      setFeedback(err.message)
    } finally {
      event.target.value = ''
    }
  }

  const saveVehicle = async (event) => {
    event.preventDefault()
    try {
      await partnerService.upsertVehicle(
        {
          categoryId: vehicleForm.categoryId,
          brand: vehicleForm.brand,
          model: vehicleForm.model,
          plateNumber: vehicleForm.plateNumber.trim().toUpperCase(),
          seats: Number(vehicleForm.seats),
          fuelType: vehicleForm.fuelType,
          color: vehicleForm.color,
          images: vehicleForm.imageUrl ? [vehicleForm.imageUrl] : [],
          documents: vehicleDocs.map((doc) => doc.inputValue).filter(Boolean),
          documentDetails: toDocumentPayload(vehicleDocs),
        },
        token,
      )
      setFeedback('Vehicle submitted for admin review.')
      reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  return (
    <SectionCard title='My vehicle' subtitle='Your linked vehicle, approval state, and operating details in one place.'>
      <InlineMessage variant='error' text={error || categories.error} />
      <InlineMessage text={feedback} />
      <PartnerBookingBroadcastPopup booking={broadcastBooking} onClose={dismissBooking} />
      <form className='mb-6 grid gap-5 rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] xl:grid-cols-2' onSubmit={saveVehicle}>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500'>Vehicle submission</p>
          <h3 className='mt-2 text-2xl font-semibold text-black'>{data?.vehicle ? 'Update vehicle for review' : 'Attach your vehicle'}</h3>
          <div className='mt-4 grid gap-3 md:grid-cols-2'>
            <select className='input-shell !border-neutral-200 !bg-neutral-50 !text-black focus:!border-black md:col-span-2' value={vehicleForm.categoryId} onChange={(event) => setVehicleForm({ ...vehicleForm, categoryId: event.target.value })}>
              {(categories.data ?? []).map((category) => (
                <option key={category.id || category._id} value={category.id || category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black focus:!border-black' placeholder='Brand' value={vehicleForm.brand} onChange={(event) => setVehicleForm({ ...vehicleForm, brand: event.target.value })} />
            <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black focus:!border-black' placeholder='Model' value={vehicleForm.model} onChange={(event) => setVehicleForm({ ...vehicleForm, model: event.target.value })} />
            <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black focus:!border-black' placeholder='Plate number' value={vehicleForm.plateNumber} onChange={(event) => setVehicleForm({ ...vehicleForm, plateNumber: event.target.value })} />
            <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black focus:!border-black' min='1' max='12' type='number' placeholder='Seats' value={vehicleForm.seats} onChange={(event) => setVehicleForm({ ...vehicleForm, seats: event.target.value })} />
            <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black focus:!border-black' placeholder='Fuel type' value={vehicleForm.fuelType} onChange={(event) => setVehicleForm({ ...vehicleForm, fuelType: event.target.value })} />
            <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black focus:!border-black' placeholder='Color' value={vehicleForm.color} onChange={(event) => setVehicleForm({ ...vehicleForm, color: event.target.value })} />
          </div>
          <label className='mt-4 block'>
            <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Vehicle Photo</span>
            <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white focus:!border-black' type='file' accept='image/*' onChange={uploadVehicleImage} />
          </label>
        </div>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500'>Vehicle Documents</p>
          <div className='mt-4 grid gap-3 md:grid-cols-2'>
            {vehicleDocs.map((doc) => (
              <label key={doc.key} className='block'>
                <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>{doc.label}</span>
                <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white focus:!border-black' type='file' accept='image/*,.pdf' onChange={(event) => uploadVehicleDocument(doc.key, event)} />
                <p className='mt-2 text-xs text-neutral-500'>{doc.inputValue ? 'File selected and ready to submit.' : 'Upload image or PDF document.'}</p>
              </label>
            ))}
          </div>
          <button className='button-primary mt-5 w-full' type='submit'>Submit vehicle for review</button>
        </div>
      </form>
      {data?.vehicle ? (
        <>
          <div className='overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.06)]'>
            <div className='grid gap-0 lg:grid-cols-2'>
              <div className='border-b border-black/10 bg-neutral-100 lg:border-b-0 lg:border-r'>
                {vehicleImage ? (
                  <img
                    alt={`${data.vehicle.brand} ${data.vehicle.model}`}
                    className='h-full min-h-[280px] w-full object-cover'
                    src={vehicleImage}
                  />
                ) : (
                  <div className='flex min-h-[280px] h-full flex-col items-center justify-center px-8 text-center'>
                    <div className='flex h-24 w-24 items-center justify-center rounded-[28px] border border-black/10 bg-white text-3xl font-semibold text-black'>
                      {String(data.vehicle.brand || 'V').charAt(0)}
                    </div>
                    <p className='mt-5 text-lg font-semibold text-black'>Vehicle photo not available</p>
                    <p className='mt-2 max-w-xs text-sm leading-6 text-neutral-500'>
                      Add a vehicle image to make this section more complete for profile and admin review surfaces.
                    </p>
                  </div>
                )}
              </div>

              <div className='p-6 sm:p-7'>
                <div className='flex flex-wrap items-start justify-between gap-4'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>My Vehicle</p>
                    <h3 className='mt-2 text-3xl font-semibold tracking-tight text-black'>
                      {data.vehicle.brand} {data.vehicle.model}
                    </h3>
                    <p className='mt-2 text-sm text-neutral-600'>
                      Plate {data.vehicle.plateNumber} | {formatText(data.vehicle.color, 'Color not added')} | {formatText(data.vehicle.fuelType, 'Fuel type not added')}
                    </p>
                  </div>
                  <StatusBadge value={data.vehicle.approvalStatus} />
                </div>

                <div className='mt-6 grid gap-4 sm:grid-cols-2'>
                  <div className='rounded-[22px] border border-black/10 bg-neutral-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Brand</p>
                    <p className='mt-2 text-base font-semibold text-black'>{formatText(data.vehicle.brand)}</p>
                  </div>
                  <div className='rounded-[22px] border border-black/10 bg-neutral-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Model</p>
                    <p className='mt-2 text-base font-semibold text-black'>{formatText(data.vehicle.model)}</p>
                  </div>
                  <div className='rounded-[22px] border border-black/10 bg-neutral-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Plate Number</p>
                    <p className='mt-2 text-base font-semibold text-black'>{formatText(data.vehicle.plateNumber)}</p>
                  </div>
                  <div className='rounded-[22px] border border-black/10 bg-neutral-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Seats</p>
                    <p className='mt-2 text-base font-semibold text-black'>{formatText(data.vehicle.seats)}</p>
                  </div>
                  <div className='rounded-[22px] border border-black/10 bg-neutral-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Fuel Type</p>
                    <p className='mt-2 text-base font-semibold text-black'>{formatText(data.vehicle.fuelType)}</p>
                  </div>
                  <div className='rounded-[22px] border border-black/10 bg-neutral-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Color</p>
                    <p className='mt-2 text-base font-semibold text-black'>{formatText(data.vehicle.color)}</p>
                  </div>
                </div>

                <div className='mt-5 rounded-[24px] border border-black/10 bg-neutral-50 p-4 text-sm text-neutral-600'>
                  <p className='font-semibold text-black'>Vehicle readiness</p>
                  <p className='mt-2 leading-6'>
                    This vehicle is linked to your partner account and is used for bookings when approval is active. Admin approval status is reflected here automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className='mt-4'>
            <DocumentStatusBoard title='Vehicle Documents' docs={vehicleDocs} onPreview={setPreviewDoc} />
          </div>
        </>
      ) : (
        <p className='text-sm text-neutral-500'>No vehicle attached yet. Submit the vehicle form above to enter admin review.</p>
      )}
      {previewDoc ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6'>
          <button className='absolute right-6 top-6 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white' type='button' onClick={() => setPreviewDoc(null)}>Close</button>
          {isVisualDocument(previewDoc.url || previewDoc.fileName) ? (
            <img alt={previewDoc.label} className='max-h-full max-w-full object-contain' src={previewDoc.url || previewDoc.fileName} />
          ) : (
            <iframe className='h-full w-full rounded-2xl bg-white' src={previewDoc.url || previewDoc.fileName} title={previewDoc.label} />
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}

export const PartnerProfilePage = () => {
  const { token, updateSessionUser } = useAuth()
  const { data, error, reload } = useResource(() => partnerService.getProfile(token), [token])
  const { booking: broadcastBooking, dismissBooking } = usePartnerBroadcastBooking(token)
  const [feedback, setFeedback] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    licenseNumber: '',
    serviceAreas: '',
  })
  const [documentInputs, setDocumentInputs] = useState({})
  const reviewState = data?.profile?.approvedByAdmin ? 'APPROVED' : 'UNDER_REVIEW'
  const identityDocs = useMemo(
    () =>
      buildDocumentDetails(REQUIRED_IDENTITY_DOCS, data?.profile?.identityDocDetails, data?.profile?.identityDocs).map((doc) => ({
        ...doc,
        inputValue: documentInputs[doc.key] ?? getDocumentInputValue(doc),
      })),
    [data?.profile?.identityDocDetails, data?.profile?.identityDocs, documentInputs],
  )

  useEffect(() => {
    if (!data?.profile || !data?.user) {
      return
    }

    setForm({
      fullName: data.user.fullName || '',
      email: data.user.email || '',
      phone: data.user.phone || '',
      avatarUrl: data.user.avatarUrl || '',
      licenseNumber: data.profile.licenseNumber || '',
      serviceAreas: Array.isArray(data.profile.serviceAreas) ? data.profile.serviceAreas.join(', ') : '',
    })

    setDocumentInputs(
      Object.fromEntries(
        buildDocumentDetails(REQUIRED_IDENTITY_DOCS, data.profile.identityDocDetails, data.profile.identityDocs).map((doc) => [
          doc.key,
          getDocumentInputValue(doc),
        ]),
      ),
    )
  }, [data?.profile, data?.user])

  const save = async (event) => {
    event.preventDefault()
    try {
      const response = await partnerService.updateProfile(
        {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          avatarUrl: form.avatarUrl,
          licenseNumber: form.licenseNumber,
          serviceAreas: form.serviceAreas.split(',').map((item) => item.trim()).filter(Boolean),
          identityDocDetails: toDocumentPayload(identityDocs),
        },
        token,
      )
      updateSessionUser({
        fullName: response?.user?.fullName || form.fullName,
        email: response?.user?.email || form.email,
        phone: response?.user?.phone || form.phone,
        avatarUrl: response?.user?.avatarUrl || form.avatarUrl,
      })
      setFeedback('Profile sent for review. Wait for admin confirmation.')
      reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setForm((current) => ({ ...current, avatarUrl: dataUrl }))
      setFeedback('')
    } catch (err) {
      setFeedback(err.message)
    } finally {
      event.target.value = ''
    }
  }

  const uploadDocument = async (docKey, event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setDocumentInputs((current) => ({
        ...current,
        [docKey]: dataUrl,
      }))
      setFeedback('')
    } catch (err) {
      setFeedback(err.message)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <SectionCard title='Partner profile' subtitle='Profile maintenance and admin verification readiness.'>
      <InlineMessage variant='error' text={error} />
      <InlineMessage text={feedback} />
      <PartnerBookingBroadcastPopup booking={broadcastBooking} onClose={dismissBooking} />
      <div className='mb-4 rounded-[22px] border border-black/10 bg-neutral-50 p-4 text-sm text-neutral-600'>
        Submit your profile card, service areas, and compulsory documents together. Once submitted, the account moves into admin review until confirmation is completed.
      </div>
      <form className='grid gap-5 xl:grid-cols-2' onSubmit={save}>
        <div className='overflow-hidden rounded-[32px] border border-black/10 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]'>
          <div className='flex flex-col items-center text-center'>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-white/50'>Actual Profile</p>
            {form.avatarUrl ? (
              <img alt={form.fullName || 'Partner avatar'} className='mt-4 h-32 w-32 rounded-[30px] border border-white/10 object-cover shadow-[0_18px_45px_rgba(0,0,0,0.25)]' src={form.avatarUrl} />
            ) : (
              <div className='mt-4 flex h-32 w-32 items-center justify-center rounded-[30px] border border-white/10 bg-white/10 text-3xl font-semibold text-white'>
                {getInitials(form.fullName)}
              </div>
            )}
            <h3 className='mt-5 text-3xl font-semibold tracking-tight text-white'>{formatText(form.fullName, 'Partner profile')}</h3>
            <p className='mt-1 text-sm text-white/65'>{formatText(form.email, 'Add email')}</p>
            <div className='mt-4 flex flex-wrap justify-center gap-2'>
              <StatusBadge value={reviewState} />
              <StatusBadge value={data?.profile?.status || 'PENDING_APPROVAL'} />
            </div>
          </div>
          <div className='mt-6 space-y-4'>
            <div className='rounded-[24px] border border-white/10 bg-white/6 p-4 text-left'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/55'>Upload Profile Photo</p>
              <input
                className='input-shell mt-3 !border-white/10 !bg-white/6 !text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:text-black focus:!border-white/30'
                type='file'
                accept='image/*'
                onChange={uploadAvatar}
              />
              <p className='mt-2 text-xs text-white/55'>
                {form.avatarUrl ? 'New profile photo selected and ready to submit.' : 'Choose a profile image to update the left card preview.'}
              </p>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-[20px] border border-white/10 bg-white/6 p-4'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/50'>Phone</p>
                <p className='mt-2 text-sm font-medium text-white'>{formatText(form.phone, 'Add phone')}</p>
              </div>
              <div className='rounded-[20px] border border-white/10 bg-white/6 p-4'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/50'>License</p>
                <p className='mt-2 text-sm font-medium text-white'>{formatText(form.licenseNumber, 'Add license')}</p>
              </div>
            </div>
            <div className='rounded-[22px] border border-white/10 bg-white/6 p-4 text-left text-sm text-white/78'>
              <p className='font-semibold text-white'>Submission status</p>
              <p className='mt-1'>
                {data?.profile?.approvedByAdmin
                  ? 'Profile is approved by admin.'
                  : 'Sent for review. Wait for admin confirmation before new assignments resume.'}
              </p>
            </div>
            <div className='rounded-[22px] border border-white/10 bg-black/20 p-4 text-left'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/50'>Service Areas</p>
              <p className='mt-2 text-sm leading-6 text-white'>{formatText(form.serviceAreas, 'Add service areas')}</p>
            </div>
          </div>
        </div>

        <div className='space-y-5 rounded-[32px] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.06)]'>
          <div className='rounded-[28px] border border-black/10 bg-neutral-50 p-5'>
            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500'>Edit Profile</p>
            <h3 className='mt-2 text-2xl font-semibold tracking-tight text-black'>Update partner information</h3>
            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <label className='block'>
                <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Full Name</span>
                <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black' value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
              <label className='block'>
                <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Phone Number</span>
                <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black' value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className='block md:col-span-2'>
                <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Email Address</span>
                <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className='block'>
                <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>License Number</span>
                <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black' value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
              </label>
              <label className='block'>
                <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Service Areas</span>
                <input className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black' placeholder='Comma separated service areas' value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} />
              </label>
            </div>
          </div>

          <div className='rounded-[28px] border border-black/10 bg-neutral-50 p-5'>
            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500'>Compulsory Documents</p>
            <p className='mt-2 text-sm text-neutral-600'>Upload the 4 required documents for admin review.</p>
            <div className='mt-4 grid gap-3 md:grid-cols-2'>
              {identityDocs.map((doc) => (
                <label key={doc.key} className='block'>
                  <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>{doc.label}</span>
                  <input
                    className='input-shell !border-neutral-200 !bg-neutral-50 !text-black file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white focus:!border-black'
                    type='file'
                    accept='image/*,.pdf'
                    onChange={(event) => uploadDocument(doc.key, event)}
                  />
                  <p className='mt-2 text-xs text-neutral-500'>
                    {doc.inputValue ? 'File selected and ready to submit.' : 'Upload image or PDF document.'}
                  </p>
                </label>
              ))}
            </div>
          </div>

          <button className='button-primary w-full' type='submit'>Submit profile to admin</button>
        </div>
      </form>
      <div className='mt-5 grid gap-4 xl:grid-cols-2'>
        <DocumentStatusBoard title='Identity Documents' docs={identityDocs} onPreview={setPreviewDoc} />
        <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500'>Verification Status</p>
          <div className='mt-3 space-y-3 text-sm text-neutral-600'>
            <div className='flex items-center gap-2'>
              <span className='font-semibold text-black'>Admin Approval</span>
              <StatusBadge value={data?.profile?.approvedByAdmin ? 'APPROVED' : 'PENDING'} />
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-semibold text-black'>Video KYC</span>
              <StatusBadge value={data?.profile?.videoKycRequested ? 'UNDER_REVIEW' : 'PENDING'} />
            </div>
            <div className='rounded-[18px] border border-black/10 bg-white p-3'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Admin Review Message</p>
              <p className='mt-2 text-sm text-neutral-600'>{formatText(data?.profile?.reviewMessage, 'No review message from admin yet.')}</p>
            </div>
            <p>Missing slots stay marked as Missing until the document is uploaded.</p>
            <p>Admin `Approved` or `Rejected` decisions on each document are reflected here automatically.</p>
          </div>
        </div>
      </div>
      {previewDoc ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6'>
          <button className='absolute right-6 top-6 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white' type='button' onClick={() => setPreviewDoc(null)}>Close</button>
          {isVisualDocument(previewDoc.url || previewDoc.fileName) ? (
            <img alt={previewDoc.label} className='max-h-full max-w-full object-contain' src={previewDoc.url || previewDoc.fileName} />
          ) : (
            <iframe className='h-full w-full rounded-2xl bg-white' src={previewDoc.url || previewDoc.fileName} title={previewDoc.label} />
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}
