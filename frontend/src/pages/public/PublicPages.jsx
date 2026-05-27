import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { vehicleService } from '../../services/vehicle.service'
import { EmptyState } from '../../components/common/EmptyState'
import { InlineMessage } from '../../components/common/InlineMessage'
import { SectionCard } from '../../components/common/SectionCard'
import { StatusBadge } from '../../components/common/StatusBadge'
import { VehicleOverviewCard } from '../../components/vehicle/VehicleOverviewCard'

export const HomePage = () => {
  const assetBase = import.meta.env.BASE_URL || '/'
  const vehicleTypes = [
    {
      name: 'Bike',
      blurb: 'Beat traffic with quick solo rides.',
      eta: '3 min',
      image: `${assetBase}static/bike.png`,
    },
    {
      name: 'Auto',
      blurb: 'Easy local trips with room for everyday bags.',
      eta: '5 min',
      image: `${assetBase}static/auto.png`,
    },
    {
      name: 'Car',
      blurb: 'Comfortable city rides for work and plans.',
      eta: '6 min',
      image: `${assetBase}static/car1.png`,
    },
    {
      name: 'AC Car',
      blurb: 'Premium cooled comfort for longer routes.',
      eta: '8 min',
      image: `${assetBase}static/car1.png`,
    },
  ]

  return (
    <div className='page-surface w-full'>
      <section className='relative select-none isolate overflow-hidden pb-10 pt-8 sm:pb-14 lg:pb-18'>
        <div className='landing-grid absolute inset-0 opacity-80' />
        <div className='premium-shell relative grid gap-8 lg:grid-cols-[1.02fr,0.98fr] lg:items-center'>
          <div className='animate-rise'>
            <div className='accent-chip inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]'>
              Premium rides, cleaner flow
            </div>
            <h1 className='mt-6 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl'>
              Book your next ride in seconds with <span className='premium-gradient-text'>VehiMeet</span>.
            </h1>
            <p className='mt-5 max-w-2xl text-base leading-8 text-neutral-600 sm:text-lg'>
              A modern mobility experience for riders, drivers, and admins. Pick a route, compare verified rides, and track every trip live without visual clutter.
            </p>
            <div className='mt-7 flex flex-wrap gap-3'>
              <Link className='button-primary min-h-12 px-6' to='/dashboard/bookings'>Explore rides</Link>
              <Link className='button-secondary min-h-12 px-6' to='/?auth=signup'>Create account</Link>
            </div>
            <div className='mt-8 grid max-w-2xl gap-3 sm:grid-cols-3'>
              {[
                ['Live', 'tracking'],
                ['Verified', 'partners'],
                ['Fast', 'booking'],
              ].map(([value, label]) => (
                <div key={label} className='soft-card rounded-[24px] p-4'>
                  <p className='text-2xl font-semibold'>{value}</p>
                  <p className='mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className='animate-rise animate-delay-1'>
            <div className='surface-card rounded-[36px] p-4 sm:p-5'>
              <div className='rounded-[30px] bg-black p-4 text-white sm:p-5'>
                <div className='flex items-center justify-between gap-4'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.22em] text-white/50'>Quick booking</p>
                    <h2 className='mt-2 text-2xl font-semibold'>Where are you going?</h2>
                  </div>
                  <span className='rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-black'>Live</span>
                </div>
                <div className='mt-5 space-y-3'>
                  <div className='rounded-[22px] border border-white/10 bg-white/8 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/45'>Pickup</p>
                    <p className='mt-2 text-sm font-medium'>Current location</p>
                  </div>
                  <div className='rounded-[22px] border border-white/10 bg-white/8 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/45'>Dropoff</p>
                    <p className='mt-2 text-sm font-medium'>Search destination</p>
                  </div>
                </div>
              </div>

              <div className='mt-4 grid gap-3'>
                {vehicleTypes.slice(0, 3).map((item, index) => (
                  <Link
                    key={item.name}
                    className={`group grid grid-cols-[76px,1fr,auto] items-center gap-3 rounded-[24px] border border-black/10 bg-white p-3 shadow-[0_14px_36px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:border-emerald-500/40 ${index === 0 ? 'ring-2 ring-emerald-500/20' : ''}`}
                    to='/vehicles'
                  >
                    <img alt={`${item.name} ride`} className='h-16 w-16 rounded-[20px] bg-neutral-100 object-cover' src={item.image} />
                    <span>
                      <span className='block font-semibold text-black'>{item.name}</span>
                      <span className='mt-1 block text-sm text-neutral-500'>{item.blurb}</span>
                    </span>
                    <span className='text-right'>
                      <span className='text-xs text-neutral-500'>{item.eta}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='premium-shell py-8 sm:py-12'>
        <div className='grid gap-5 md:grid-cols-3'>
          {[
            ['01', 'Choose a route', 'Search pickup and drop with map-backed route estimates.'],
            ['02', 'Pick a ride', 'Compare vehicles, pricing, comfort, and availability quickly.'],
            ['03', 'Track live', 'Follow dispatch, driver movement, ETA, and trip status.'],
          ].map(([step, title, text]) => (
            <div key={step} className='soft-card rounded-[30px] p-6 transition hover:-translate-y-1'>
              <span className='accent-chip rounded-full px-3 py-1 text-xs font-bold'>{step}</span>
              <h3 className='mt-5 text-xl font-semibold'>{title}</h3>
              <p className='mt-3 text-sm leading-7 text-neutral-600'>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className='premium-shell py-8 sm:py-12'>
        <div className='grid gap-6 lg:grid-cols-[0.9fr,1.1fr] lg:items-end'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600'>Ride classes</p>
            <h2 className='mt-3 text-3xl font-semibold tracking-tight sm:text-5xl'>A ride for every city moment.</h2>
            <p className='mt-4 max-w-xl text-sm leading-7 text-neutral-600'>
              Vehicle cards are easier to scan, built around rider decisions: speed, comfort, ETA, and expected fare.
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            {vehicleTypes.map((item, index) => (
              <Link
                key={item.name}
                className={`landing-vehicle-card soft-card rounded-[30px] p-4 ${index > 1 ? 'animate-delay-1' : ''}`}
                to='/vehicles'
              >
                <img alt={`${item.name} vehicle type`} className='landing-vehicle-image h-44 w-full rounded-[24px] object-cover' src={item.image} />
                <div className='mt-4 flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='text-xl font-semibold'>{item.name}</h3>
                    <p className='mt-2 text-sm leading-6 text-neutral-600'>{item.blurb}</p>
                  </div>
                  <div className='rounded-2xl bg-emerald-50 px-3 py-2 text-right text-black'>
                    <p className='text-xs text-neutral-500'>{item.eta}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className='premium-shell py-8 sm:py-12'>
        <div className='grid gap-5 lg:grid-cols-[1.1fr,0.9fr]'>
          <div className='rounded-[36px] bg-black p-6 text-white sm:p-8'>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300'>For riders</p>
            <h2 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>Less waiting, fewer decisions, clearer trips.</h2>
            <div className='mt-6 grid gap-3 sm:grid-cols-3'>
              {['Saved locations', 'Fare estimate', 'Status timeline'].map((item) => (
                <div key={item} className='rounded-[24px] border border-white/10 bg-white/8 p-4 text-sm font-semibold text-white/85'>{item}</div>
              ))}
            </div>
          </div>
          <div className='surface-card rounded-[36px] p-6 sm:p-8'>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600'>For drivers</p>
            <h2 className='mt-3 text-3xl font-semibold tracking-tight'>A focused panel for requests, earnings, and live status.</h2>
            <p className='mt-4 text-sm leading-7 text-neutral-600'>
              Partners get a mobile-friendly workflow for accepting rides, sharing GPS, and moving through trip stages.
            </p>
          </div>
        </div>
      </section>

      <section className='premium-shell py-8 sm:py-12'>
        <div className='surface-card rounded-[36px] p-6 sm:p-8'>
          <div className='grid gap-6 lg:grid-cols-[0.9fr,1.1fr] lg:items-center'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600'>Loved by early riders</p>
              <h2 className='mt-3 text-3xl font-semibold tracking-tight'>A calmer way to move through the city.</h2>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              {[
                ['The booking screen feels direct and the live status is easy to understand.', 'Aarav, rider'],
                ['I can see assigned rides and update my location without hunting around.', 'Neha, partner'],
              ].map(([quote, name]) => (
                <div key={name} className='rounded-[26px] border border-black/10 bg-white p-5'>
                  <p className='text-sm leading-7 text-neutral-700'>{quote}</p>
                  <p className='mt-4 text-sm font-semibold text-black'>{name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className='premium-shell pb-8 pt-4'>
        <div className='rounded-[30px] border border-black/10 bg-black p-6 text-white sm:p-8'>
          <div className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
            <div>
              <h2 className='text-3xl font-semibold tracking-tight'>Ready for your next ride?</h2>
              <p className='mt-2 text-sm text-white/65'>Browse verified vehicles or sign in to manage bookings.</p>
            </div>
            <div className='flex flex-wrap gap-3'>
              <Link className='rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200' to='/vehicles'>Browse rides</Link>
              <Link className='rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black' to='/?auth=login'>Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    vehicleService
      .getVehicles()
      .then(setVehicles)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <SectionCard title='Vehicle inventory' subtitle='Public browsing and pricing visibility for customer discovery.'>
      <InlineMessage variant='error' text={error} />
      <div className='mt-4 grid gap-4 lg:grid-cols-2'>
        {vehicles.map((vehicle) => (
          <VehicleOverviewCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
      {!vehicles.length && !error ? (
        <div className='mt-4'>
          <EmptyState title='No vehicles yet' message='Approved vehicles will appear here once inventory is available.' />
        </div>
      ) : null}
    </SectionCard>
  )
}

export const VehicleDetailPage = () => {
  const { id } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    vehicleService
      .getVehicleById(id)
      .then(setVehicle)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return <InlineMessage variant='error' text={error} />
  }

  if (!vehicle) {
    return <SectionCard title='Loading vehicle details...' />
  }

  return (
    <SectionCard
      title={`${vehicle.brand} ${vehicle.model}`}
      subtitle='Vehicle detail and suitability for bookings.'
      actions={
        <Link className='button-primary' to='/?auth=login'>
          Login to book
        </Link>
      }
    >
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='panel-muted p-5 text-sm text-slate-300'>
          <p className='text-lg font-semibold text-white'>{vehicle.category?.name}</p>
          <p className='mt-2'>{vehicle.category?.description}</p>
          <div className='mt-4 space-y-2'>
            <p>Seats: {vehicle.seats}</p>
            <p>Fuel: {vehicle.fuelType}</p>
            <p>Color: {vehicle.color}</p>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
