export const KeyStatCard = ({ label, value, helper }) => (
  <div className='group soft-card rounded-[22px] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_52px_rgba(15,23,42,0.1)] sm:rounded-[26px] sm:p-5'>
    <div className='mb-4 h-1.5 w-10 rounded-full bg-emerald-500 transition group-hover:w-16' />
    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>{label}</p>
    <p className='mt-3 break-words text-2xl font-semibold text-black sm:text-3xl'>{value}</p>
    {helper ? <p className='mt-2 text-xs leading-5 text-neutral-500'>{helper}</p> : null}
  </div>
)
