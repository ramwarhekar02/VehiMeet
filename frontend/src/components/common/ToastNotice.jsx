export const ToastNotice = ({ toast, onClose }) => {
  if (!toast) {
    return null
  }

  const toneClass =
    toast.variant === 'error'
      ? 'toast-error'
      : 'toast-success'

  return (
    <div className='pointer-events-none fixed bottom-5 right-5 z-[70] flex max-w-sm justify-end sm:bottom-6 sm:right-6'>
      <div
        className={`pointer-events-auto w-full rounded-[24px] border px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] ${toneClass}`}
        role='status'
        aria-live='polite'
      >
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.22em] opacity-70'>
              {toast.variant === 'error' ? 'Notice' : 'Success'}
            </p>
            <p className='mt-2 text-sm font-medium leading-6'>{toast.message}</p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex h-8 w-8 items-center justify-center rounded-full text-current opacity-70 transition hover:bg-black/5 hover:opacity-100'
            aria-label='Close notification'
          >
            x
          </button>
        </div>
      </div>
    </div>
  )
}
