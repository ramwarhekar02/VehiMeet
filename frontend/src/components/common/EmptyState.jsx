export const EmptyState = ({ title, message, action }) => (
  <div className='panel-muted flex flex-col items-start gap-3 p-5'>
    <h3 className='text-base font-semibold text-white sm:text-lg'>{title}</h3>
    <p className='text-sm text-slate-400'>{message}</p>
    {action}
  </div>
)
