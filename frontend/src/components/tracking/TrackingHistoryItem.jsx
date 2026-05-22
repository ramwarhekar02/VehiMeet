export const TrackingHistoryItem = ({ entry }) => (
  <div className='panel-muted p-4 text-sm text-slate-300'>
    <p className='font-semibold text-white'>
      {entry.location.lat}, {entry.location.lng}
    </p>
    <p>Speed: {entry.speed} km/h | Heading: {entry.heading} deg</p>
    <p className='text-slate-500'>{new Date(entry.timestamp).toLocaleString()}</p>
  </div>
)
