const formatStatusLabel = (value) =>
  String(value || 'UNKNOWN')
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

export const StatusBadge = ({ value }) => {
  const palette =
    {
      APPROVED: 'status-badge-strong',
      VERIFIED: 'status-badge-strong',
      ONLINE: 'status-badge-strong',
      TRIP_COMPLETED: 'status-badge-strong',
      UNDER_REVIEW: 'status-badge-muted',
      BUSY: 'status-badge-muted',
      PENDING: 'status-badge-soft',
      PENDING_KYC: 'status-badge-soft',
      PENDING_ASSIGNMENT: 'status-badge-soft',
      PENDING_APPROVAL: 'status-badge-soft',
      ASSIGNED: 'status-badge-soft',
      PARTNER_EN_ROUTE: 'status-badge-soft',
      ARRIVED: 'status-badge-soft',
      TRIP_STARTED: 'status-badge-soft',
      KYC_REJECTED: 'status-badge-faint',
      REJECTED: 'status-badge-faint',
      CANCELLED_BY_USER: 'status-badge-faint',
      OFFLINE: 'status-badge-faint',
      SUSPENDED: 'status-badge-faint',
    }[value] || 'status-badge-faint'

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${palette}`}>
      {formatStatusLabel(value)}
    </span>
  )
}
