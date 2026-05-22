import { Link } from 'react-router-dom'
import { StatusBadge } from '../common/StatusBadge'

export const VehicleOverviewCard = ({ vehicle, showDetailsLink = true }) => (
  <article className='panel-muted p-4 sm:p-5'>
    <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
      <div>
        <h3 className='text-lg font-semibold text-white'>
          {vehicle.brand} {vehicle.model}
        </h3>
        <p className='mt-1 text-sm text-slate-400'>{vehicle.category?.description}</p>
      </div>
      <StatusBadge value={vehicle.approvalStatus} />
    </div>
    <div className='mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-2'>
      <p>Seats: {vehicle.seats}</p>
      <p>Fuel: {vehicle.fuelType}</p>
      <p>Color: {vehicle.color}</p>
      <p>Plate: {vehicle.plateNumber}</p>
      <p>Base fare: Rs. {vehicle.category?.baseFare}</p>
      <p>Per km: Rs. {vehicle.category?.perKmRate}</p>
    </div>
    {showDetailsLink ? (
      <div className='mt-5'>
        <Link to={`/vehicles/${vehicle.id}`} className='button-secondary w-full sm:w-auto'>
          View details
        </Link>
      </div>
    ) : null}
  </article>
)
