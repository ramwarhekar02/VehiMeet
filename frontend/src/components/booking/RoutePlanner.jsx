import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

const DEFAULT_CENTER = { lat: 21.1458, lng: 79.0882 }
const DEFAULT_LOCATION_LABEL = 'Nagpur, Maharashtra, India'
const NAGPUR_VIEWBOX = {
  west: 78.95,
  north: 21.24,
  east: 79.18,
  south: 21.02,
}
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'
const OSRM_BASE_URL = 'https://router.project-osrm.org'

const createLetterIcon = (letter) =>
  L.divIcon({
    className: 'custom-map-pin',
    html: `<span>${letter}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })

const pickupIcon = createLetterIcon('P')
const dropIcon = createLetterIcon('D')

const nearlySamePoint = (a, b) => {
  if (!a || !b) {
    return false
  }

  return (
    Math.abs(Number(a.lat) - Number(b.lat)) < 0.00001 &&
    Math.abs(Number(a.lng) - Number(b.lng)) < 0.00001
  )
}

const buildSearchUrl = (query) =>
  `${NOMINATIM_BASE_URL}/search?format=jsonv2&limit=5&countrycodes=in&viewbox=${NAGPUR_VIEWBOX.west},${NAGPUR_VIEWBOX.north},${NAGPUR_VIEWBOX.east},${NAGPUR_VIEWBOX.south}&bounded=1&q=${encodeURIComponent(query)}`

const buildReverseUrl = ({ lat, lng }) =>
  `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`

const buildRouteUrl = (pickup, drop) =>
  `${OSRM_BASE_URL}/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`

const decodeSuggestion = (item) => ({
  label: item.display_name,
  location: {
    lat: Number(item.lat),
    lng: Number(item.lon),
  },
})

export const RoutePlanner = ({ value, onChange }) => {
  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const routeLayerRef = useRef(null)
  const pickupMarkerRef = useRef(null)
  const dropMarkerRef = useRef(null)
  const activeFieldRef = useRef('pickup')
  const plotModeRef = useRef(false)
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [activeField, setActiveField] = useState('pickup')
  const [isPlotModeActive, setIsPlotModeActive] = useState(false)
  const [pickupSuggestions, setPickupSuggestions] = useState([])
  const [dropSuggestions, setDropSuggestions] = useState([])
  const [pickupLoading, setPickupLoading] = useState(false)
  const [dropLoading, setDropLoading] = useState(false)
  const pickupAbortRef = useRef(null)
  const dropAbortRef = useRef(null)

  useEffect(() => {
    activeFieldRef.current = activeField
  }, [activeField])

  useEffect(() => {
    plotModeRef.current = isPlotModeActive
  }, [isPlotModeActive])

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return
    }

    const map = L.map(mapElementRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const pickupMarker = L.marker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], {
      draggable: true,
      icon: pickupIcon,
      opacity: 1,
    }).addTo(map)

    const dropMarker = L.marker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], {
      draggable: true,
      icon: dropIcon,
      opacity: 0,
    }).addTo(map)

    const updateFromReverse = async (kind, latlng) => {
      try {
        const response = await fetch(buildReverseUrl({ lat: latlng.lat, lng: latlng.lng }))
        if (!response.ok) {
          throw new Error(`Reverse geocode failed with status ${response.status}`)
        }

        const result = await response.json()
        onChange({
          [`${kind}Address`]: result.display_name || DEFAULT_LOCATION_LABEL,
          [`${kind}Location`]: {
            lat: latlng.lat,
            lng: latlng.lng,
          },
        })
      } catch (error) {
        console.error('[RoutePlanner] Reverse geocode failed:', error)
        onChange({
          [`${kind}Location`]: {
            lat: latlng.lat,
            lng: latlng.lng,
          },
        })
      }
    }

    pickupMarker.on('dragend', () => updateFromReverse('pickup', pickupMarker.getLatLng()))
    dropMarker.on('dragend', () => updateFromReverse('drop', dropMarker.getLatLng()))

    map.on('click', (event) => {
      if (!activeFieldRef.current || !plotModeRef.current) {
        return
      }

      const kind = activeFieldRef.current
      const marker = kind === 'pickup' ? pickupMarker : dropMarker
      marker.setLatLng(event.latlng)
      marker.setOpacity(1)
      setIsPlotModeActive(false)
      updateFromReverse(kind, event.latlng)
    })

    mapRef.current = map
    pickupMarkerRef.current = pickupMarker
    dropMarkerRef.current = dropMarker
    setMapsReady(true)
  }, [onChange])

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !pickupMarkerRef.current || !dropMarkerRef.current) {
      return
    }

    const map = mapRef.current
    const pickupMarker = pickupMarkerRef.current
    const dropMarker = dropMarkerRef.current
    const pickup = value.pickupLocation
    const drop = value.dropLocation

    if (pickup) {
      const point = L.latLng(Number(pickup.lat), Number(pickup.lng))
      if (!nearlySamePoint(pickup, pickupMarker.getLatLng())) {
        pickupMarker.setLatLng(point)
      }
      pickupMarker.setOpacity(1)
    } else {
      pickupMarker.setOpacity(0)
    }

    if (drop) {
      const point = L.latLng(Number(drop.lat), Number(drop.lng))
      if (!nearlySamePoint(drop, dropMarker.getLatLng())) {
        dropMarker.setLatLng(point)
      }
      dropMarker.setOpacity(1)
    } else {
      dropMarker.setOpacity(0)
    }

    const points = [pickup, drop].filter(Boolean)
    if (points.length === 1) {
      map.setView([Number(points[0].lat), Number(points[0].lng)], 18)
    }
  }, [mapsReady, value.dropLocation, value.pickupLocation])

  useEffect(() => {
    if (!mapsReady || !mapRef.current) {
      return
    }

    const map = mapRef.current
    const pickup = value.pickupLocation
    const drop = value.dropLocation

    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    if (!pickup || !drop) {
      if (value.estimatedDistanceKm !== 0 || value.estimatedDurationMin !== 0) {
        onChange({
          estimatedDistanceKm: 0,
          estimatedDurationMin: 0,
        })
      }
      return
    }

    let cancelled = false

    const fetchRoute = async () => {
      try {
        const response = await fetch(buildRouteUrl(pickup, drop))
        if (!response.ok) {
          throw new Error(`Route request failed with status ${response.status}`)
        }

        const result = await response.json()
        const route = result.routes?.[0]
        if (!route || cancelled) {
          return
        }

        routeLayerRef.current = L.geoJSON(route.geometry, {
          style: {
            color: '#111111',
            weight: 5,
            opacity: 1,
          },
        }).addTo(map)

        map.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] })

        onChange({
          estimatedDistanceKm: Number((route.distance / 1000).toFixed(1)),
          estimatedDurationMin: Math.max(1, Math.round(route.duration / 60)),
        })
      } catch (error) {
        console.error('[RoutePlanner] Route lookup failed:', error)
        setMapError('Unable to calculate route right now. Please try again.')
      }
    }

    fetchRoute()

    return () => {
      cancelled = true
    }
  }, [mapsReady, onChange, value.dropLocation, value.estimatedDistanceKm, value.estimatedDurationMin, value.pickupLocation])

  useEffect(() => {
    const query = value.pickupAddress?.trim() || ''
    if (query.length < 2 || query === DEFAULT_LOCATION_LABEL) {
      setPickupSuggestions([])
      setPickupLoading(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      pickupAbortRef.current?.abort()
      const controller = new AbortController()
      pickupAbortRef.current = controller
      setPickupLoading(true)

      try {
        const response = await fetch(buildSearchUrl(query), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Pickup search failed with status ${response.status}`)
        }
        const result = await response.json()
        setPickupSuggestions(result.map(decodeSuggestion))
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('[RoutePlanner] Pickup suggestion lookup failed:', error)
        }
      } finally {
        setPickupLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      pickupAbortRef.current?.abort()
    }
  }, [value.pickupAddress])

  useEffect(() => {
    const query = value.dropAddress?.trim() || ''
    if (query.length < 2 || query === DEFAULT_LOCATION_LABEL) {
      setDropSuggestions([])
      setDropLoading(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      dropAbortRef.current?.abort()
      const controller = new AbortController()
      dropAbortRef.current = controller
      setDropLoading(true)

      try {
        const response = await fetch(buildSearchUrl(query), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Dropoff search failed with status ${response.status}`)
        }
        const result = await response.json()
        setDropSuggestions(result.map(decodeSuggestion))
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('[RoutePlanner] Dropoff suggestion lookup failed:', error)
        }
      } finally {
        setDropLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      dropAbortRef.current?.abort()
    }
  }, [value.dropAddress])

  const applySuggestion = (kind, suggestion) => {
    onChange({
      [`${kind}Address`]: suggestion.label,
      [`${kind}Location`]: suggestion.location,
    })
    setIsPlotModeActive(false)

    if (kind === 'pickup') {
      setPickupSuggestions([])
      setActiveField('pickup')
    } else {
      setDropSuggestions([])
      setActiveField('drop')
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError('Browser geolocation is not supported on this device.')
      return
    }

    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const pickupLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
        }

        try {
          const response = await fetch(buildReverseUrl(pickupLocation))
          const result = response.ok ? await response.json() : null
          onChange({
            pickupAddress: result?.display_name || 'Current location',
            pickupLocation,
          })
        } catch (error) {
          console.error('[RoutePlanner] Current location reverse lookup failed:', error)
          onChange({
            pickupAddress: 'Current location',
            pickupLocation,
          })
        } finally {
          setGeoLoading(false)
        }
      },
      (error) => {
        console.error('[RoutePlanner] Failed to get current location.', error)
        setMapError(error.message || 'Unable to get current location.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className='space-y-5'>
      <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4 text-sm text-neutral-700'>
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Default location</p>
        <p className='mt-2 font-medium text-black'>{DEFAULT_LOCATION_LABEL}</p>
        <p className='mt-1 text-xs text-neutral-500'>Pickup and drop suggestions are prioritized around this area.</p>
      </div>

      <div className='grid gap-4 md:grid-cols-[1fr,auto]'>
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='relative space-y-2'>
            <span className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Pickup</span>
            <input
              className='w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black'
              placeholder='Search pickup location'
              value={value.pickupAddress || ''}
              onChange={(event) => {
                setActiveField('pickup')
                onChange({ pickupAddress: event.target.value })
              }}
            />
            {(pickupLoading || pickupSuggestions.length > 0) && (
              <div className='absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.12)]'>
                {pickupLoading ? (
                  <div className='px-4 py-3 text-sm text-neutral-500'>Searching locations...</div>
                ) : (
                  pickupSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.label}-${suggestion.location.lat}-${suggestion.location.lng}`}
                      type='button'
                      onClick={() => applySuggestion('pickup', suggestion)}
                      className='block w-full border-t border-black/5 px-4 py-3 text-left text-sm text-black transition first:border-t-0 hover:bg-neutral-50'
                    >
                      {suggestion.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </label>

          <label className='relative space-y-2'>
            <span className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Dropoff</span>
            <input
              className='w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black'
              placeholder='Search dropoff location'
              value={value.dropAddress || ''}
              onChange={(event) => {
                setActiveField('drop')
                onChange({ dropAddress: event.target.value })
              }}
            />
            {(dropLoading || dropSuggestions.length > 0) && (
              <div className='absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.12)]'>
                {dropLoading ? (
                  <div className='px-4 py-3 text-sm text-neutral-500'>Searching locations...</div>
                ) : (
                  dropSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.label}-${suggestion.location.lat}-${suggestion.location.lng}`}
                      type='button'
                      onClick={() => applySuggestion('drop', suggestion)}
                      className='block w-full border-t border-black/5 px-4 py-3 text-left text-sm text-black transition first:border-t-0 hover:bg-neutral-50'
                    >
                      {suggestion.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </label>
        </div>

        <button
          type='button'
          onClick={useCurrentLocation}
          disabled={geoLoading}
          className='inline-flex w-full items-center justify-center rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60 md:w-auto'
        >
          {geoLoading ? 'Locating...' : 'Use my location'}
        </button>
      </div>

      <div className='flex flex-wrap gap-3'>
        <button
          type='button'
          onClick={() => {
            setActiveField('pickup')
            setIsPlotModeActive(true)
            onChange({
              pickupAddress: value.pickupAddress || DEFAULT_LOCATION_LABEL,
              pickupLocation: value.pickupLocation || DEFAULT_CENTER,
            })
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeField === 'pickup'
              ? 'bg-black text-white'
              : 'border border-black/15 text-black hover:bg-black hover:text-white'
          }`}
        >
          Plot pickup pin
        </button>
        <button
          type='button'
          onClick={() => {
            setActiveField('drop')
            setIsPlotModeActive(true)
            if (!value.dropLocation) {
              onChange({
                dropAddress: value.dropAddress || DEFAULT_LOCATION_LABEL,
                dropLocation: value.dropLocation || DEFAULT_CENTER,
              })
            }
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeField === 'drop'
              ? 'bg-black text-white'
              : 'border border-black/15 text-black hover:bg-black hover:text-white'
          }`}
        >
          Plot drop pin
        </button>
        <p className='w-full text-sm leading-6 text-neutral-500 md:self-center'>
          {isPlotModeActive
            ? 'Click once on the map to place the active pin. You can still drag markers after they appear.'
            : 'Choose Plot pickup pin or Plot drop pin before clicking the map. You can drag markers after they appear.'}
        </p>
      </div>

      <div className='overflow-hidden rounded-[28px] border border-black/10 bg-neutral-100'>
        <div ref={mapElementRef} className='h-[280px] w-full bg-neutral-200 sm:h-[320px] md:h-[420px]' />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Route preview</p>
          <div className='mt-4 space-y-2 text-sm text-neutral-700'>
            <p>Pickup: {value.pickupAddress || 'Not selected yet'}</p>
            <p>Dropoff: {value.dropAddress || 'Not selected yet'}</p>
          </div>
        </div>
        <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Trip estimate</p>
          <div className='mt-4 space-y-2 text-sm text-neutral-700'>
            <p>Distance: {value.estimatedDistanceKm ? `${value.estimatedDistanceKm} km` : '--'}</p>
            <p>Duration: {value.estimatedDurationMin ? `${value.estimatedDurationMin} min` : '--'}</p>
          </div>
        </div>
      </div>

      {mapError ? (
        <div className='rounded-[22px] border border-black/10 bg-white p-4 text-sm text-neutral-600'>
          {mapError}
        </div>
      ) : null}
    </div>
  )
}
