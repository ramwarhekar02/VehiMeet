export const InlineMessage = ({ variant = 'info', text }) => {
  if (!text) return null

  const color =
    variant === 'error'
      ? 'border-rose-400/35 bg-rose-500/10 text-rose-100'
      : 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100'

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${color}`}>{text}</div>
}
