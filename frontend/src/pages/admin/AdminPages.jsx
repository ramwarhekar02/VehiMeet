import { Fragment, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useRealtimeEvent } from '../../contexts/useSocket'
import { useResource } from '../../hooks/useResource'
import { adminService } from '../../services/admin.service'
import { InlineMessage } from '../../components/common/InlineMessage'
import { SectionCard } from '../../components/common/SectionCard'
import { StatusBadge } from '../../components/common/StatusBadge'
import { KeyStatCard } from '../../components/dashboard/KeyStatCard'

const BOOKING_ATTENTION_STATUSES = ['PENDING_ASSIGNMENT', 'ASSIGNED', 'PARTNER_EN_ROUTE', 'ARRIVED', 'TRIP_STARTED']
const ACTIVE_TRIP_STATUSES = ['ASSIGNED', 'PARTNER_EN_ROUTE', 'ARRIVED', 'TRIP_STARTED']
const DASHBOARD_PARTNER_LIMIT = 4
const PARTNERS_PER_PAGE = 10
const REVIEW_FILTER_OPTIONS = ['ALL', 'APPROVED', 'UNDER_REVIEW', 'PENDING']
const STATUS_FILTER_OPTIONS = ['ALL', 'ONLINE', 'OFFLINE', 'BUSY', 'PENDING_APPROVAL', 'SUSPENDED']
const DOCS_FILTER_OPTIONS = ['ALL', 'All submitted', 'Partially submitted', 'Missing documents']
const REQUIRED_IDENTITY_DOCS = [
  { key: 'aadhaarCard', label: 'Aadhaar Card' },
  { key: 'panCard', label: 'PAN Card' },
  { key: 'drivingLicense', label: 'Driving License' },
  { key: 'profilePhoto', label: 'Profile Photo' },
]
// const REQUIRED_VEHICLE_DOCS = [
//   { key: 'registrationCertificate', label: 'Registration Certificate' },
//   { key: 'insuranceCertificate', label: 'Insurance Certificate' },
//   { key: 'pollutionCertificate', label: 'Pollution Certificate' },
//   { key: 'vehiclePermit', label: 'Vehicle Permit' },
// ]

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

const formatList = (items, fallback = 'Not added') => {
  if (!Array.isArray(items) || items.length === 0) {
    return fallback
  }

  return items.join(', ')
}

const getPartnerReviewState = (partner) => {
  if (partner?.approvedByAdmin) {
    return 'APPROVED'
  }

  const hasSubmittedInfo =
    Boolean(partner?.licenseNumber) ||
    (partner?.identityDocs?.length ?? 0) > 0 ||
    (partner?.vehicle?.documents?.length ?? 0) > 0 ||
    (partner?.serviceAreas?.length ?? 0) > 0

  return hasSubmittedInfo ? 'UNDER_REVIEW' : 'PENDING'
}

const getDocsSummary = (partner) => {
  const identityCount = buildDocumentDetails(REQUIRED_IDENTITY_DOCS, partner?.identityDocDetails, partner?.identityDocs).filter((doc) => doc.fileName || doc.url).length
  // const vehicleDocCount = buildDocumentDetails(REQUIRED_VEHICLE_DOCS, partner?.vehicle?.documentDetails, partner?.vehicle?.documents).filter((doc) => doc.fileName || doc.url).length

  if (identityCount === REQUIRED_IDENTITY_DOCS.length) {
    return 'All submitted'
  }

  if (identityCount > 0) {
    return 'Partially submitted'
  }

  return 'Missing documents'
}

const hasAllRequiredIdentityDocs = (partner) =>
  buildDocumentDetails(REQUIRED_IDENTITY_DOCS, partner?.identityDocDetails, partner?.identityDocs).every((doc) => doc.fileName || doc.url)

const PartnerOperationsTable = ({ partners = [], onApprove, onUpdate, compact = false }) => {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [reviewFilter, setReviewFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [docsFilter, setDocsFilter] = useState('ALL')
  const [editingPartnerId, setEditingPartnerId] = useState('')
  const [editForm, setEditForm] = useState({
    reviewStatus: 'PENDING',
  })
  const filteredPartners = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return partners.filter((partner) => {
      const reviewState = getPartnerReviewState(partner)
      const docsSummary = getDocsSummary(partner)
      const haystack = [
        partner.user?.fullName,
        partner.user?.email,
        partner.user?.phone,
        partner.vehicle?.brand,
        partner.vehicle?.model,
        partner.vehicle?.plateNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const matchesReview = reviewFilter === 'ALL' || reviewState === reviewFilter
      const matchesStatus = statusFilter === 'ALL' || partner.status === statusFilter
      const matchesDocs = docsFilter === 'ALL' || docsSummary === docsFilter

      return matchesSearch && matchesReview && matchesStatus && matchesDocs
    })
  }, [docsFilter, partners, reviewFilter, searchTerm, statusFilter])

  const startEditing = (partner) => {
    setEditingPartnerId(partner.userId)
    setEditForm({
      reviewStatus: getPartnerReviewState(partner),
    })
  }

  const cancelEditing = () => {
    setEditingPartnerId('')
  }

  const saveEditing = async () => {
    if (!editingPartnerId || !onUpdate) {
      return
    }

    await onUpdate(editingPartnerId, { approvedByAdmin: editForm.reviewStatus === 'APPROVED' })
    setEditingPartnerId('')
  }

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / PARTNERS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginatedPartners = useMemo(() => {
    const startIndex = (currentPage - 1) * PARTNERS_PER_PAGE
    return filteredPartners.slice(startIndex, startIndex + PARTNERS_PER_PAGE)
  }, [currentPage, filteredPartners])
  const showPagination = filteredPartners.length > PARTNERS_PER_PAGE

  return (
    <div className='overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.06)]'>
      <div className='flex flex-col gap-3 border-b border-black/10 bg-neutral-50 px-4 py-3 md:flex-row md:items-center md:justify-between'>
        <div className='text-sm text-neutral-500'>
          Showing {filteredPartners.length} of {partners.length} partners
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <input
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            type='text'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder='Search partner'
          />
          <select
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            value={reviewFilter}
            onChange={(event) => setReviewFilter(event.target.value)}
          >
            {REVIEW_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL' ? 'All reviews' : option}
              </option>
            ))}
          </select>
          <select
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL' ? 'All status' : option}
              </option>
            ))}
          </select>
          <select
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            value={docsFilter}
            onChange={(event) => setDocsFilter(event.target.value)}
          >
            {DOCS_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL' ? 'All docs' : option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-black/10 text-left'>
          <thead className='bg-neutral-950 text-white'>
            <tr className='text-[11px] uppercase tracking-[0.18em] text-white/60'>
              <th className='px-3 py-3 font-medium'>Sr No</th>
              <th className='px-3 py-3 font-medium'>Partner</th>
              <th className='px-3 py-3 font-medium'>Review</th>
              <th className='px-3 py-3 font-medium'>Availability</th>
              <th className='px-3 py-3 font-medium'>Vehicle</th>
              <th className='px-3 py-3 font-medium'>Documents</th>
              {onApprove ? <th className='px-3 py-3 font-medium'>Action</th> : null}
            </tr>
          </thead>
          <tbody className='divide-y divide-black/10 bg-white'>
            {paginatedPartners.length ? (
              paginatedPartners.map((partner, index) => {
                const reviewState = getPartnerReviewState(partner)
                const docsSummary = getDocsSummary(partner)
                const serialNumber = (currentPage - 1) * PARTNERS_PER_PAGE + index + 1
                const isEditing = editingPartnerId === partner.userId

                return (
                  <Fragment key={partner.id}>
                    <tr key={partner.id} className='text-[13px] text-neutral-700'>
                      <td className='px-3 py-3 font-semibold text-black'>{serialNumber}</td>
                      <td className='px-3 py-3'>
                        <div className='max-w-[300px] truncate whitespace-nowrap'>
                          <span className='font-semibold text-black'>{formatText(partner.user?.fullName, 'Unknown partner')}</span>
                        </div>
                      </td>
                      <td className='px-3 py-3'>
                        <div className='flex items-center gap-2 whitespace-nowrap'>
                          <StatusBadge value={reviewState} />
                          <span className='text-xs text-neutral-500'>{partner.approvedByAdmin ? 'Admin done' : 'Admin pending'}</span>
                        </div>
                      </td>
                      <td className='px-3 py-3'>
                        <div className='flex items-center gap-2 whitespace-nowrap'>
                          <StatusBadge value={partner.status} />
                          <span className='text-xs text-neutral-500'>
                            {partner.currentLocation?.coordinates?.length ? 'Location shared' : 'No location'}
                          </span>
                        </div>
                      </td>
                      <td className='px-3 py-3'>
                        <div className='max-w-[260px] truncate whitespace-nowrap'>
                          <span className='font-medium text-black'>
                            {partner.vehicle ? `${partner.vehicle.brand} ${partner.vehicle.model}` : 'Vehicle not attached'}
                          </span>
                          <span className='mx-1.5 text-neutral-300'>|</span>
                          <span className='text-neutral-500'>{formatText(partner.vehicle?.plateNumber, 'No plate')}</span>
                          <span className='mx-1.5 text-neutral-300'>|</span>
                          <span className='text-neutral-500'>{formatText(partner.vehicle?.approvalStatus, 'Pending')}</span>
                        </div>
                      </td>
                      <td className='px-3 py-3'>
                        <div className='max-w-[230px] truncate whitespace-nowrap'>
                          <span className='font-medium text-black'>{docsSummary}</span>
                          <span className='mx-1.5 text-neutral-300'>|</span>
                          <span className='text-neutral-500'>ID {partner.identityDocs?.length ?? 0}</span>
                          <span className='mx-1.5 text-neutral-300'>|</span>
                          <span className='text-neutral-500'>Vehicle {partner.vehicle?.documents?.length ?? 0}</span>
                        </div>
                      </td>
                      {onApprove ? (
                        <td className='px-3 py-3'>
                          <div className='flex items-center gap-2 whitespace-nowrap'>
                            <button
                              className='rounded-full border border-black/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white'
                              type='button'
                              onClick={() => (isEditing ? cancelEditing() : startEditing(partner))}
                            >
                              {isEditing ? 'Close' : 'Edit'}
                            </button>
                            <button
                              className='rounded-full bg-black px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500'
                              type='button'
                              onClick={() => onApprove(partner.userId)}
                              disabled={partner.approvedByAdmin}
                            >
                              {partner.approvedByAdmin ? 'Approved' : compact ? 'Approve' : 'Approve partner'}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                    {isEditing ? (
                      <tr key={`${partner.id}-edit`}>
                        <td className='bg-neutral-50 px-3 py-4' colSpan={onApprove ? 7 : 6}>
                          <div className='grid max-w-sm gap-3'>
                            <label className='block'>
                              <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Review Status</span>
                              <select
                                className='w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
                                value={editForm.reviewStatus}
                                onChange={(event) => setEditForm((current) => ({ ...current, reviewStatus: event.target.value }))}
                              >
                                {REVIEW_FILTER_OPTIONS.filter((option) => option !== 'ALL').map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className='mt-3 flex flex-wrap gap-2'>
                            <button
                              className='rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-neutral-800'
                              type='button'
                              onClick={saveEditing}
                            >
                              Save changes
                            </button>
                            <button
                              className='rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white'
                              type='button'
                              onClick={cancelEditing}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            ) : (
              <tr>
                <td className='px-3 py-8 text-sm text-neutral-500' colSpan={onApprove ? 7 : 6}>
                  No partner records available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination ? (
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
          <p>
            Showing {(currentPage - 1) * PARTNERS_PER_PAGE + 1}-{Math.min(currentPage * PARTNERS_PER_PAGE, filteredPartners.length)} of {filteredPartners.length}
          </p>
          <div className='flex items-center gap-2'>
            <button
              className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:text-neutral-400'
              type='button'
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>
              Page {currentPage} / {totalPages}
            </span>
            <button
              className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:text-neutral-400'
              type='button'
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const CompactPartnerTable = ({ partners = [] }) => (
  <div className='overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.06)]'>
    <table className='min-w-full divide-y divide-black/10 text-left'>
      <thead className='bg-neutral-950 text-white'>
        <tr className='text-[11px] uppercase tracking-[0.18em] text-white/60'>
          <th className='px-3 py-3 font-medium'>Sr No</th>
          <th className='px-3 py-3 font-medium'>Partner</th>
          <th className='px-3 py-3 font-medium'>Review</th>
          <th className='px-3 py-3 font-medium'>Status</th>
          <th className='px-3 py-3 font-medium'>Vehicle</th>
          <th className='px-3 py-3 font-medium'>Docs</th>
        </tr>
      </thead>
      <tbody className='divide-y divide-black/10 text-sm text-neutral-700'>
        {partners.length ? (
          partners.map((partner, index) => (
            <tr key={partner.id}>
              <td className='px-3 py-3 font-semibold text-black'>{index + 1}</td>
              <td className='px-3 py-3'>
                <div className='max-w-[220px] truncate whitespace-nowrap'>
                  <span className='font-semibold text-black'>{formatText(partner.user?.fullName, 'Unknown partner')}</span>
                  <span className='mx-1.5 text-neutral-300'>|</span>
                  <span className='text-xs text-neutral-500'>{formatText(partner.user?.phone, 'Phone not added')}</span>
                </div>
              </td>
              <td className='px-3 py-3'>
                <StatusBadge value={getPartnerReviewState(partner)} />
              </td>
              <td className='px-3 py-3'>
                <StatusBadge value={partner.status} />
              </td>
              <td className='px-3 py-3'>
                <div className='max-w-[220px] truncate whitespace-nowrap'>
                  <span className='text-black'>{partner.vehicle ? `${partner.vehicle.brand} ${partner.vehicle.model}` : 'No vehicle'}</span>
                  <span className='mx-1.5 text-neutral-300'>|</span>
                  <span className='text-xs text-neutral-500'>{formatText(partner.vehicle?.plateNumber, 'No plate')}</span>
                </div>
              </td>
              <td className='px-3 py-3 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500'>
                {getDocsSummary(partner)}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td className='px-3 py-8 text-sm text-neutral-500' colSpan={6}>
              No partner records available yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)

const UsersOperationsTable = ({ users = [] }) => {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [contactFilter, setContactFilter] = useState('ALL')

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return users.filter((user) => {
      const haystack = [user.fullName, user.email, user.phone].filter(Boolean).join(' ').toLowerCase()
      const hasPhone = Boolean(user.phone)
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const matchesContact =
        contactFilter === 'ALL' ||
        (contactFilter === 'WITH_PHONE' && hasPhone) ||
        (contactFilter === 'WITHOUT_PHONE' && !hasPhone)

      return matchesSearch && matchesContact
    })
  }, [contactFilter, searchTerm, users])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PARTNERS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * PARTNERS_PER_PAGE
    return filteredUsers.slice(startIndex, startIndex + PARTNERS_PER_PAGE)
  }, [currentPage, filteredUsers])
  const showPagination = filteredUsers.length > PARTNERS_PER_PAGE

  return (
    <div className='overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.06)]'>
      <div className='flex flex-col gap-3 border-b border-black/10 bg-neutral-50 px-4 py-3 md:flex-row md:items-center md:justify-between'>
        <div className='text-sm text-neutral-500'>
          Showing {filteredUsers.length} of {users.length} users
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <input
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            type='text'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder='Search user'
          />
          <select
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            value={contactFilter}
            onChange={(event) => setContactFilter(event.target.value)}
          >
            <option value='ALL'>All contacts</option>
            <option value='WITH_PHONE'>With phone</option>
            <option value='WITHOUT_PHONE'>Without phone</option>
          </select>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-black/10 text-left'>
          <thead className='bg-neutral-950 text-white'>
            <tr className='text-[11px] uppercase tracking-[0.18em] text-white/60'>
              <th className='px-3 py-3 font-medium'>Sr No</th>
              <th className='px-3 py-3 font-medium'>Customer</th>
              <th className='px-3 py-3 font-medium'>Email</th>
              <th className='px-3 py-3 font-medium'>Phone</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-black/10 bg-white'>
            {paginatedUsers.length ? (
              paginatedUsers.map((user, index) => (
                <tr key={user.id} className='text-[13px] text-neutral-700'>
                  <td className='px-3 py-3 font-semibold text-black'>{(currentPage - 1) * PARTNERS_PER_PAGE + index + 1}</td>
                  <td className='px-3 py-3 font-semibold text-black'>{formatText(user.fullName, 'Unknown user')}</td>
                  <td className='px-3 py-3 text-neutral-500'>{formatText(user.email)}</td>
                  <td className='px-3 py-3 text-neutral-500'>{formatText(user.phone, 'Phone not added')}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className='px-3 py-8 text-sm text-neutral-500' colSpan={4}>
                  No user records available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination ? (
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
          <p>
            Showing {(currentPage - 1) * PARTNERS_PER_PAGE + 1}-{Math.min(currentPage * PARTNERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
          </p>
          <div className='flex items-center gap-2'>
            <button
              className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:text-neutral-400'
              type='button'
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>
              Page {currentPage} / {totalPages}
            </span>
            <button
              className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:text-neutral-400'
              type='button'
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const KycReviewBoard = ({ partners = [], onApprove, onUpdate }) => {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [videoFilter, setVideoFilter] = useState('ALL')
  const [detailPartnerId, setDetailPartnerId] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)
  const [drafts, setDrafts] = useState({})

  const filteredPartners = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return partners.filter((partner) => {
      const haystack = [
        partner.user?.fullName,
        partner.user?.email,
        partner.user?.phone,
        partner.licenseNumber,
        ...(partner.identityDocs ?? []),
        ...(partner.vehicle?.documents ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const matchesVideo =
        videoFilter === 'ALL' ||
        (videoFilter === 'REQUESTED' && partner.videoKycRequested) ||
        (videoFilter === 'NOT_REQUESTED' && !partner.videoKycRequested)

      return matchesSearch && matchesVideo
    })
  }, [partners, searchTerm, videoFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / PARTNERS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginatedPartners = useMemo(() => {
    const startIndex = (currentPage - 1) * PARTNERS_PER_PAGE
    return filteredPartners.slice(startIndex, startIndex + PARTNERS_PER_PAGE)
  }, [currentPage, filteredPartners])
  const showPagination = filteredPartners.length > PARTNERS_PER_PAGE

  const buildDraftFromPartner = (partner) => ({
    videoKycRequested: Boolean(partner.videoKycRequested),
    reviewMessage: partner.reviewMessage || '',
    identityDocDetails: Object.fromEntries(
      buildDocumentDetails(REQUIRED_IDENTITY_DOCS, partner.identityDocDetails, partner.identityDocs).map((doc) => [
        doc.key,
        {
          label: doc.label,
          fileName: doc.fileName || null,
          url: doc.url || null,
          status: doc.status,
        },
      ]),
    ),
  })

  const openDetails = (partner) => {
    setDetailPartnerId((current) => (current === partner.userId ? '' : partner.userId))
    setDrafts((current) => ({
      ...current,
      [partner.userId]: current[partner.userId] || buildDraftFromPartner(partner),
    }))
  }

  const updateDraftVideoRequest = (partnerId, value) => {
    setDrafts((current) => ({
      ...current,
      [partnerId]: {
        ...current[partnerId],
        videoKycRequested: value,
      },
    }))
  }

  const updateDraftReviewMessage = (partnerId, value) => {
    setDrafts((current) => ({
      ...current,
      [partnerId]: {
        ...current[partnerId],
        reviewMessage: value,
      },
    }))
  }

  const updateDocumentStatus = (partnerId, docKey, status) => {
    setDrafts((current) => ({
      ...current,
      [partnerId]: {
        ...current[partnerId],
        identityDocDetails: {
          ...current[partnerId]?.identityDocDetails,
          [docKey]: {
            ...current[partnerId]?.identityDocDetails?.[docKey],
            status,
          },
        },
      },
    }))
  }

  const saveDraft = async (partner) => {
    const draft = drafts[partner.userId]
    if (!draft) {
      return
    }

    await onUpdate(partner.userId, {
      videoKycRequested: draft.videoKycRequested,
      reviewMessage: draft.reviewMessage,
      identityDocDetails: draft.identityDocDetails,
    })
    setDetailPartnerId('')
  }

  return (
    <div className='overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.06)]'>
      <div className='flex flex-col gap-3 border-b border-black/10 bg-neutral-50 px-4 py-3 md:flex-row md:items-center md:justify-between'>
        <div className='text-sm text-neutral-500'>
          Showing {filteredPartners.length} of {partners.length} KYC reviews
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <input
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            type='text'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder='Search KYC'
          />
          <select
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            value={videoFilter}
            onChange={(event) => setVideoFilter(event.target.value)}
          >
            <option value='ALL'>All video KYC</option>
            <option value='REQUESTED'>Video requested</option>
            <option value='NOT_REQUESTED'>Video not requested</option>
          </select>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-black/10 text-left'>
          <thead className='bg-neutral-950 text-white'>
            <tr className='text-[11px] uppercase tracking-[0.18em] text-white/60'>
              <th className='px-3 py-3 font-medium'>Sr No</th>
              <th className='px-3 py-3 font-medium'>Partner</th>
              <th className='px-3 py-3 font-medium'>Docs</th>
              <th className='px-3 py-3 font-medium'>Video KYC</th>
              <th className='px-3 py-3 font-medium'>Approval</th>
              <th className='px-3 py-3 font-medium'>Action</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-black/10 bg-white'>
            {paginatedPartners.length ? (
              paginatedPartners.map((partner, index) => {
                const serialNumber = (currentPage - 1) * PARTNERS_PER_PAGE + index + 1
                const isOpen = detailPartnerId === partner.userId
                const draft = drafts[partner.userId] || buildDraftFromPartner(partner)
                const identityDocs = buildDocumentDetails(REQUIRED_IDENTITY_DOCS, draft.identityDocDetails, partner.identityDocs)

                return (
                  <Fragment key={partner.id}>
                    <tr className='text-[13px] text-neutral-700'>
                      <td className='px-3 py-3 font-semibold text-black'>{serialNumber}</td>
                      <td className='px-3 py-3'>
                        <div className='max-w-[260px] truncate whitespace-nowrap'>
                          <span className='font-semibold text-black'>{formatText(partner.user?.fullName, 'Unknown partner')}</span>
                          <span className='mx-1.5 text-neutral-300'>|</span>
                          <span className='text-neutral-500'>{formatText(partner.licenseNumber, 'No license')}</span>
                        </div>
                      </td>
                      <td className='px-3 py-3 text-neutral-500'>
                        ID {identityDocs.filter((doc) => doc.fileName || doc.url).length} / {REQUIRED_IDENTITY_DOCS.length}
                      </td>
                      <td className='px-3 py-3'>
                        <StatusBadge value={partner.videoKycRequested ? 'UNDER_REVIEW' : 'PENDING'} />
                      </td>
                      <td className='px-3 py-3'>
                        <StatusBadge value={partner.approvedByAdmin ? 'APPROVED' : 'PENDING'} />
                      </td>
                      <td className='px-3 py-3'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <button
                            className='rounded-full border border-black/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white'
                            type='button'
                            onClick={() => openDetails(partner)}
                          >
                            {isOpen ? 'Hide' : 'Details'}
                          </button>
                          <button
                            className='rounded-full bg-black px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500'
                            type='button'
                            onClick={() => onApprove(partner.userId)}
                            disabled={partner.approvedByAdmin}
                          >
                            {partner.approvedByAdmin ? 'Approved' : 'Approve partner'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr>
                        <td className='bg-neutral-50 px-3 py-4' colSpan={6}>
                          <div className='grid gap-4 xl:grid-cols-2'>
                            <div className='rounded-[20px] border border-black/10 bg-white p-4'>
                              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>KYC Overview</p>
                              <div className='mt-3 grid gap-2 text-sm text-neutral-600'>
                                <p><span className='font-semibold text-black'>Partner:</span> {formatText(partner.user?.fullName, 'Unknown partner')}</p>
                                <p><span className='font-semibold text-black'>Email:</span> {formatText(partner.user?.email)}</p>
                                <p><span className='font-semibold text-black'>Phone:</span> {formatText(partner.user?.phone, 'Phone not added')}</p>
                                <p><span className='font-semibold text-black'>License:</span> {formatText(partner.licenseNumber, 'Not submitted')}</p>
                                <p><span className='font-semibold text-black'>Service Areas:</span> {formatList(partner.serviceAreas, 'Not added')}</p>
                                {/* <p><span className='font-semibold text-black'>Vehicle:</span> {partner.vehicle ? `${partner.vehicle.brand} ${partner.vehicle.model} (${partner.vehicle.plateNumber})` : 'Vehicle not attached'}</p> */}
                                {/* <p><span className='font-semibold text-black'>Vehicle Approval:</span> {formatText(partner.vehicle?.approvalStatus, 'Pending approval')}</p> */}
                                <p><span className='font-semibold text-black'>Video KYC:</span> {draft.videoKycRequested ? 'Requested' : 'Not requested'}</p>
                                <p><span className='font-semibold text-black'>Admin Approval:</span> {partner.approvedByAdmin ? 'Approved' : 'Pending review'}</p>
                              </div>
                              <div className='mt-4'>
                                <label className='block'>
                                  <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Video KYC Request</span>
                                  <select
                                    className='w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
                                    value={draft.videoKycRequested ? 'REQUESTED' : 'NOT_REQUESTED'}
                                    onChange={(event) => updateDraftVideoRequest(partner.userId, event.target.value === 'REQUESTED')}
                                  >
                                    <option value='NOT_REQUESTED'>Not Requested</option>
                                    <option value='REQUESTED'>Requested</option>
                                  </select>
                                </label>
                                <label className='mt-3 block'>
                                  <span className='mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Review Message To Partner</span>
                                  <textarea
                                    className='min-h-[110px] w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-black'
                                    value={draft.reviewMessage}
                                    onChange={(event) => updateDraftReviewMessage(partner.userId, event.target.value)}
                                    placeholder='Write review notes or next steps for the partner'
                                  />
                                </label>
                              </div>
                            </div>
                            <div className='rounded-[20px] border border-black/10 bg-white p-4'>
                              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>Document Review</p>
                              <div className='mt-3 space-y-4'>
                                <div>
                                  <p className='text-sm font-semibold text-black'>Identity Documents</p>
                                  <div className='mt-2 space-y-2'>
                                    {identityDocs.map((doc) => (
                                      <div key={doc.key} className='rounded-2xl border border-black/10 bg-neutral-50 px-3 py-3'>
                                        <div className='flex flex-wrap items-center justify-between gap-2'>
                                          <span className='text-sm font-semibold text-black'>{doc.label}</span>
                                          <StatusBadge value={doc.fileName || doc.url ? doc.status : 'PENDING'} />
                                        </div>
                                        <div className='mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600'>
                                          {doc.fileName || doc.url ? (
                                            <>
                                              <button
                                                className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white'
                                                type='button'
                                                onClick={() => setPreviewDoc(doc)}
                                              >
                                                {isVisualDocument(doc.url || doc.fileName) ? 'Open Preview' : 'Open Document'}
                                              </button>
                                              <span className='truncate'>{doc.fileName || doc.url}</span>
                                            </>
                                          ) : (
                                            <span className='font-medium text-neutral-500'>Missing</span>
                                          )}
                                        </div>
                                        <div className='mt-3 flex flex-wrap gap-2'>
                                          <button
                                            className='rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white'
                                            type='button'
                                            onClick={() => updateDocumentStatus(partner.userId, doc.key, 'APPROVED')}
                                          >
                                            Approve
                                          </button>
                                          <button
                                            className='rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white'
                                            type='button'
                                            onClick={() => updateDocumentStatus(partner.userId, doc.key, 'REJECTED')}
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* <div>
                                  <p className='text-sm font-semibold text-black'>Vehicle Documents</p>
                                </div> */}
                              </div>
                              <div className='mt-4 flex flex-wrap gap-2'>
                                <button
                                  className='rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-neutral-800'
                                  type='button'
                                  onClick={() => saveDraft(partner)}
                                >
                                  Save Changes
                                </button>
                                <button
                                  className='rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white'
                                  type='button'
                                  onClick={() =>
                                    setDrafts((current) => ({
                                      ...current,
                                      [partner.userId]: buildDraftFromPartner(partner),
                                    }))
                                  }
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            ) : (
              <tr>
                <td className='px-3 py-8 text-sm text-neutral-500' colSpan={6}>
                  No KYC records available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination ? (
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
          <p>
            Showing {(currentPage - 1) * PARTNERS_PER_PAGE + 1}-{Math.min(currentPage * PARTNERS_PER_PAGE, filteredPartners.length)} of {filteredPartners.length}
          </p>
          <div className='flex items-center gap-2'>
            <button
              className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:text-neutral-400'
              type='button'
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>
              Page {currentPage} / {totalPages}
            </span>
            <button
              className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:text-neutral-400'
              type='button'
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
      {previewDoc ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6'>
          <button
            className='absolute right-6 top-6 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white'
            type='button'
            onClick={() => setPreviewDoc(null)}
          >
            Close
          </button>
          <div className='absolute left-6 top-6 max-w-[70vw] text-sm text-white/80'>
            <p className='font-semibold text-white'>{previewDoc.label}</p>
            <p className='mt-1 break-all'>{previewDoc.fileName || previewDoc.url}</p>
          </div>
          {isVisualDocument(previewDoc.url || previewDoc.fileName) ? (
            <img
              alt={previewDoc.label}
              className='max-h-full max-w-full object-contain'
              src={previewDoc.url || previewDoc.fileName}
            />
          ) : (
            <iframe className='h-full w-full rounded-2xl bg-white' src={previewDoc.url || previewDoc.fileName} title={previewDoc.label} />
          )}
        </div>
      ) : null}
    </div>
  )
}

const BookingsOperationsTable = ({ bookings = [], partners = [], onAssign }) => {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [assignmentFilter, setAssignmentFilter] = useState('ALL')
  const [selectedPartners, setSelectedPartners] = useState({})

  const bookingStatusOptions = useMemo(
    () => ['ALL', ...new Set(bookings.map((booking) => booking.status).filter(Boolean))],
    [bookings],
  )

  const filteredBookings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return bookings.filter((booking) => {
      const haystack = [
        booking.bookingCode,
        booking.customer?.fullName,
        booking.partner?.fullName,
        booking.pickup?.address,
        booking.drop?.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const isAssigned = Boolean(booking.partner?.id || booking.partnerId)
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const matchesStatus = statusFilter === 'ALL' || booking.status === statusFilter
      const matchesAssignment =
        assignmentFilter === 'ALL' ||
        (assignmentFilter === 'ASSIGNED' && isAssigned) ||
        (assignmentFilter === 'UNASSIGNED' && !isAssigned)

      return matchesSearch && matchesStatus && matchesAssignment
    })
  }, [assignmentFilter, bookings, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PARTNERS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * PARTNERS_PER_PAGE
    return filteredBookings.slice(startIndex, startIndex + PARTNERS_PER_PAGE)
  }, [currentPage, filteredBookings])
  const showPagination = filteredBookings.length > PARTNERS_PER_PAGE

  const handlePartnerSelect = (bookingId, partnerId) => {
    setSelectedPartners((current) => ({ ...current, [bookingId]: partnerId }))
  }

  const handleAssign = (bookingId) => {
    const partnerId = selectedPartners[bookingId]
    if (!partnerId) {
      return
    }

    onAssign(bookingId, partnerId)
  }

  return (
    <div className='overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.06)]'>
      <div className='flex flex-col gap-3 border-b border-black/10 bg-neutral-50 px-4 py-3 md:flex-row md:items-center md:justify-between'>
        <div className='text-sm text-neutral-500'>
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <input
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            type='text'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder='Search booking'
          />
          <select
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {bookingStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL' ? 'All status' : option}
              </option>
            ))}
          </select>
          <select
            className='rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black'
            value={assignmentFilter}
            onChange={(event) => setAssignmentFilter(event.target.value)}
          >
            <option value='ALL'>All bookings</option>
            <option value='ASSIGNED'>Assigned</option>
            <option value='UNASSIGNED'>Unassigned</option>
          </select>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-black/10 text-left'>
          <thead className='bg-neutral-950 text-white'>
            <tr className='text-[11px] uppercase tracking-[0.18em] text-white/60'>
              <th className='px-3 py-3 font-medium'>Sr No</th>
              <th className='px-3 py-3 font-medium'>Booking</th>
              <th className='px-3 py-3 font-medium'>Route</th>
              <th className='px-3 py-3 font-medium'>Customer</th>
              <th className='px-3 py-3 font-medium'>Status</th>
              <th className='px-3 py-3 font-medium'>Partner</th>
              <th className='px-3 py-3 font-medium'>Assign</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-black/10 bg-white'>
            {paginatedBookings.length ? (
              paginatedBookings.map((booking, index) => (
                <tr key={booking.id} className='text-[13px] text-neutral-700'>
                  <td className='px-3 py-3 font-semibold text-black'>{(currentPage - 1) * PARTNERS_PER_PAGE + index + 1}</td>
                  <td className='px-3 py-3 font-semibold text-black'>{formatText(booking.bookingCode, 'No code')}</td>
                  <td className='px-3 py-3'>
                    <div className='max-w-[280px] truncate whitespace-nowrap text-neutral-500'>
                      <span>{formatText(booking.pickup?.address, 'No pickup')}</span>
                      <span className='mx-1.5 text-neutral-300'>|</span>
                      <span>{formatText(booking.drop?.address, 'No drop')}</span>
                    </div>
                  </td>
                  <td className='px-3 py-3 text-neutral-500'>{formatText(booking.customer?.fullName, 'Unknown customer')}</td>
                  <td className='px-3 py-3'>
                    <StatusBadge value={booking.status} />
                  </td>
                  <td className='px-3 py-3 text-neutral-500'>{formatText(booking.partner?.fullName, 'Awaiting assignment')}</td>
                  <td className='px-3 py-3'>
                    <div className='flex items-center gap-2 whitespace-nowrap'>
                      <select
                        className='max-w-[180px] rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black outline-none transition focus:border-black'
                        value={selectedPartners[booking.id] ?? ''}
                        onChange={(event) => handlePartnerSelect(booking.id, event.target.value)}
                      >
                        <option value=''>Select partner</option>
                        {partners.map((partner) => (
                          <option key={partner.userId} value={partner.userId}>
                            {partner.user?.fullName}
                          </option>
                        ))}
                      </select>
                      <button
                        className='rounded-full bg-black px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500'
                        type='button'
                        onClick={() => handleAssign(booking.id)}
                        disabled={!selectedPartners[booking.id]}
                      >
                        Assign
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className='px-3 py-8 text-sm text-neutral-500' colSpan={7}>
                  No booking records available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination ? (
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
          <p>
            Showing {(currentPage - 1) * PARTNERS_PER_PAGE + 1}-{Math.min(currentPage * PARTNERS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length}
          </p>
          <div className='flex items-center gap-2'>
            <button
              className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:text-neutral-400'
              type='button'
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500'>
              Page {currentPage} / {totalPages}
            </span>
            <button
              className='rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:text-neutral-400'
              type='button'
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export const AdminDashboardPage = () => {
  const { token } = useAuth()
  const dashboard = useResource(() => adminService.getDashboard(token), [token])
  const bookings = useResource(() => adminService.getBookings(token), [token])
  const partners = useResource(() => adminService.getPartners(token), [token])
  const reloadAdminDashboard = useCallback(() => {
    dashboard.reload()
    bookings.reload()
    partners.reload()
  }, [bookings, dashboard, partners])

  useRealtimeEvent('booking:created', reloadAdminDashboard)
  useRealtimeEvent('booking:updated', reloadAdminDashboard)
  useRealtimeEvent('partner:assigned', reloadAdminDashboard)
  useRealtimeEvent('partner:statusChanged', reloadAdminDashboard)
  useRealtimeEvent('kyc:statusChanged', reloadAdminDashboard)

  const dashboardData = dashboard.data
  const partnerRows = useMemo(() => partners.data ?? [], [partners.data])
  const bookingRows = useMemo(() => bookings.data ?? [], [bookings.data])

  const overviewStats = useMemo(() => {
    const openBookings = bookingRows.filter((booking) => BOOKING_ATTENTION_STATUSES.includes(booking.status)).length
    const readyPartners = partnerRows.filter((partner) => partner.approvedByAdmin && partner.status === 'ONLINE').length
    const underReviewPartners = partnerRows.filter((partner) => getPartnerReviewState(partner) === 'UNDER_REVIEW').length
    const missingDocs = partnerRows.filter((partner) => getDocsSummary(partner) === 'Missing documents').length

    return {
      openBookings,
      readyPartners,
      underReviewPartners,
      missingDocs,
    }
  }, [bookingRows, partnerRows])

  const dispatchFeed = useMemo(
    () =>
      bookingRows
        .filter((booking) => BOOKING_ATTENTION_STATUSES.includes(booking.status))
        .slice(0, 5),
    [bookingRows],
  )

  const priorityPartners = useMemo(
    () =>
      [...partnerRows]
        .sort((left, right) => {
          const leftScore = Number(!left.approvedByAdmin) * 3 + Number(getDocsSummary(left) !== 'All submitted') * 2
          const rightScore = Number(!right.approvedByAdmin) * 3 + Number(getDocsSummary(right) !== 'All submitted') * 2

          return rightScore - leftScore
        })
        .slice(0, DASHBOARD_PARTNER_LIMIT),
    [partnerRows],
  )

  const dashboardError = dashboard.error || bookings.error || partners.error

  return (
    <div className='min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f5f5f5_0%,#ececec_28%,#ffffff_68%)] text-black'>
      <section className='bg-black px-4 py-6 text-white sm:py-8 md:px-8 md:py-10'>
        <div className='mx-auto max-w-7xl'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-white/55'>Admin Command</p>
          <div className='mt-4 grid gap-5 lg:grid-cols-[1.1fr,0.9fr] lg:items-start'>
            <div>
              <div className='mt-5 flex flex-wrap gap-2'>
                <Link className='rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200' to='/admin/bookings'>
                  Open bookings
                </Link>
                <Link className='rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black' to='/admin/kyc'>
                  Review KYC
                </Link>
                <Link className='rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black' to='/admin/users'>
                  Users
                </Link>
              </div>
            </div>
            <div className='grid gap-3 rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:grid-cols-2'>
              <div className='rounded-[20px] border border-white/10 bg-white/5 p-3'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-white/55'>Queue health</p>
                <p className='mt-2 text-2xl font-semibold text-white'>{overviewStats.openBookings}</p>
                <p className='mt-1 text-xs leading-5 text-white/65'>Open bookings still need attention from dispatch.</p>
              </div>
              <div className='rounded-[20px] border border-white/10 bg-white/5 p-3'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-white/55'>Partner readiness</p>
                <p className='mt-2 text-2xl font-semibold text-white'>{overviewStats.readyPartners}</p>
                <p className='mt-1 text-xs leading-5 text-white/65'>Approved partners currently online and ready to take trips.</p>
              </div>
              <div className='rounded-[20px] border border-white/10 bg-white/5 p-3'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-white/55'>KYC in review</p>
                <p className='mt-2 text-2xl font-semibold text-white'>{overviewStats.underReviewPartners}</p>
                <p className='mt-1 text-xs leading-5 text-white/65'>Profiles have submitted enough data for admin review.</p>
              </div>
              <div className='rounded-[20px] border border-white/10 bg-white/5 p-3'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-white/55'>Missing docs</p>
                <p className='mt-2 text-2xl font-semibold text-white'>{overviewStats.missingDocs}</p>
                <p className='mt-1 text-xs leading-5 text-white/65'>Partners still need identity or vehicle document uploads.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-7'>
        <InlineMessage variant='error' text={dashboardError} />
        {dashboardData ? (
          <>
            <div className='grid gap-4 md:grid-cols-3 xl:grid-cols-6'>
              <KeyStatCard label='Users' value={dashboardData.stats.totalUsers} helper='Registered customer base' />
              <KeyStatCard label='Vehicles' value={dashboardData.stats.totalVehicles} helper='Attached to the network' />
              <KeyStatCard label='Bookings' value={dashboardData.stats.totalBookings} helper='Total booking records' />
              <KeyStatCard label='Active trips' value={dashboardData.stats.activeTrips} helper='Trips live in dispatch' />
              <KeyStatCard label='Pending approvals' value={dashboardData.stats.pendingKyc} helper='Partner reviews waiting' />
              <KeyStatCard label='Online partners' value={dashboardData.stats.onlinePartners} helper='Available in the network' />
            </div>
            <div className='mt-5 grid gap-4 xl:grid-cols-[1.05fr,0.95fr]'>
              <div className='rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_18px_48px_rgba(0,0,0,0.06)]'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Recent bookings</p>
                    <h2 className='mt-1 text-xl font-semibold text-black'>Dispatch pulse</h2>
                  </div>
                  <Link className='text-sm font-semibold text-black underline underline-offset-4' to='/admin/bookings'>
                    View all
                  </Link>
                </div>
                <div className='mt-4 space-y-2.5'>
                  {(dispatchFeed.length ? dispatchFeed : dashboardData.recentBookings).map((booking) => (
                    <div key={booking.id} className='rounded-[18px] border border-black/10 bg-neutral-50 p-3'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold text-black'>{booking.bookingCode}</p>
                          <p className='mt-1 text-xs text-neutral-500'>{booking.pickup.address}</p>
                        </div>
                        <StatusBadge value={booking.status} />
                      </div>
                      <div className='mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.16em] text-neutral-400'>
                        <span>Drop {formatText(booking.drop?.address, 'Not added')}</span>
                        <span>Partner {formatText(booking.partner?.fullName, 'Awaiting assignment')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className='grid gap-6'>
                <div className='rounded-[24px] border border-black/10 bg-neutral-50 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Focus areas</p>
                  <h2 className='mt-1 text-xl font-semibold text-black'>What needs attention</h2>
                  <div className='mt-4 space-y-3 text-sm leading-6 text-neutral-600'>
                    <p>
                      {overviewStats.openBookings > overviewStats.readyPartners
                        ? 'Open bookings are outpacing ready partners. Keep approvals and availability updates moving before requests begin queueing.'
                        : 'Dispatch is stable right now, but keeping partners online and approved will protect the queue as demand rises.'}
                    </p>
                    <p>
                      {overviewStats.missingDocs > 0
                        ? 'Some partner records still have missing document uploads. Use the KYC and partner review boards to close those gaps quickly.'
                        : 'Document coverage is healthy. Move next into assignment speed and live partner availability checks.'}
                      </p>
                  </div>
                  <div className='mt-4 flex flex-wrap gap-2'>
                    <Link className='rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800' to='/admin/partners'>
                      Manage partners
                    </Link>
                    <Link className='rounded-full border border-black/15 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-black hover:text-white' to='/admin/users'>
                      View users
                    </Link>
                  </div>
                </div>
                <div className='rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_18px_48px_rgba(0,0,0,0.06)]'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Command snapshot</p>
                  <h2 className='mt-1 text-xl font-semibold text-black'>Network readiness</h2>
                  <div className='mt-4 grid gap-2.5 sm:grid-cols-3'>
                    <div className='rounded-[18px] border border-black/10 bg-neutral-50 p-3'>
                      <p className='text-xs uppercase tracking-[0.18em] text-neutral-400'>Partners approved</p>
                      <p className='mt-1 text-xl font-semibold text-black'>
                        {partnerRows.filter((partner) => partner.approvedByAdmin).length}/{partnerRows.length}
                      </p>
                    </div>
                    <div className='rounded-[18px] border border-black/10 bg-neutral-50 p-3'>
                      <p className='text-xs uppercase tracking-[0.18em] text-neutral-400'>Trips in motion</p>
                      <p className='mt-1 text-xl font-semibold text-black'>
                        {bookingRows.filter((booking) => ACTIVE_TRIP_STATUSES.includes(booking.status)).length}
                      </p>
                    </div>
                    <div className='rounded-[18px] border border-black/10 bg-neutral-50 p-3'>
                      <p className='text-xs uppercase tracking-[0.18em] text-neutral-400'>Profiles needing review</p>
                      <p className='mt-1 text-xl font-semibold text-black'>{priorityPartners.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='mt-5 rounded-[26px] border border-black/10 bg-neutral-950 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]'>
              <div className='flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-white/50'>Partner operations</p>
                  <h2 className='mt-1 text-xl font-semibold'>Approval and document board</h2>
                  <p className='mt-2 max-w-3xl text-xs leading-5 text-white/65'>
                    Compact partner overview with approval state, live status, vehicle, and document completion.
                  </p>
                </div>
                <Link className='rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black' to='/admin/partners'>
                  Open partner management
                </Link>
              </div>
              <div className='mt-4'>
                <CompactPartnerTable partners={priorityPartners.length ? priorityPartners : partnerRows.slice(0, DASHBOARD_PARTNER_LIMIT)} />
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}

export const AdminBookingsPage = () => {
  const { token } = useAuth()
  const bookings = useResource(() => adminService.getBookings(token), [token])
  const partners = useResource(() => adminService.getPartners(token), [token])
  const [feedback, setFeedback] = useState('')
  const reloadDispatch = useCallback(() => {
    bookings.reload()
    partners.reload()
  }, [bookings, partners])

  useRealtimeEvent('booking:created', reloadDispatch)
  useRealtimeEvent('booking:updated', reloadDispatch)
  useRealtimeEvent('partner:assigned', reloadDispatch)
  useRealtimeEvent('tracking:location', reloadDispatch)

  const assignPartner = async (bookingId, partnerId) => {
    try {
      await adminService.assignBooking(bookingId, { partnerId }, token)
      setFeedback('Partner assigned successfully.')
      bookings.reload()
      partners.reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  return (
    <SectionCard title='Booking dispatch board' subtitle='Admin assignment actions for the booking lifecycle.'>
      <InlineMessage variant='error' text={bookings.error || partners.error} />
      <InlineMessage text={feedback} />
      <BookingsOperationsTable bookings={bookings.data ?? []} partners={partners.data ?? []} onAssign={assignPartner} />
    </SectionCard>
  )
}

export const AdminUsersPage = () => {
  const { token } = useAuth()
  const { data, error } = useResource(() => adminService.getUsers(token), [token])

  return (
    <SectionCard title='Customer directory'>
      <InlineMessage variant='error' text={error} />
      <UsersOperationsTable users={data ?? []} />
    </SectionCard>
  )
}

export const AdminPartnersPage = () => {
  const { token, showToast } = useAuth()
  const { data, error, reload } = useResource(() => adminService.getPartners(token), [token])
  const [feedback, setFeedback] = useState('')
  const reloadPartners = useCallback(() => reload(), [reload])

  useRealtimeEvent('partner:statusChanged', reloadPartners)
  useRealtimeEvent('partner:assigned', reloadPartners)

  const approvePartner = async (partnerId) => {
    const partner = (data ?? []).find((item) => item.userId === partnerId)
    if (partner && !hasAllRequiredIdentityDocs(partner)) {
      showToast(`Warning: complete all 4 compulsory documents before approving ${partner.user?.fullName || 'this partner'}.`, 'error')
      return
    }

    try {
      await adminService.approvePartner(partnerId, token)
      setFeedback('Partner approved.')
      reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  const updatePartner = async (partnerId, payload) => {
    try {
      await adminService.updatePartner(partnerId, payload, token)
      setFeedback('Partner details updated.')
      reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  return (
    <SectionCard title='Partner approvals'>
      <InlineMessage variant='error' text={error} />
      <InlineMessage text={feedback} />
      <PartnerOperationsTable partners={data ?? []} onApprove={approvePartner} onUpdate={updatePartner} />
    </SectionCard>
  )
}

export const AdminKycPage = () => {
  const { token, showToast } = useAuth()
  const partners = useResource(() => adminService.getPartners(token), [token])
  const [feedback, setFeedback] = useState('')
  const reloadKyc = useCallback(() => partners.reload(), [partners])

  useRealtimeEvent('kyc:statusChanged', reloadKyc)
  useRealtimeEvent('partner:statusChanged', reloadKyc)

  const pendingPartners = useMemo(
    () => (partners.data ?? []).filter((item) => !item.approvedByAdmin),
    [partners.data],
  )

  const review = async (partnerId) => {
    const partner = pendingPartners.find((item) => item.userId === partnerId)
    if (partner && !hasAllRequiredIdentityDocs(partner)) {
      showToast(`Warning: complete all 4 compulsory documents before approving ${partner.user?.fullName || 'this partner'}.`, 'error')
      return
    }

    try {
      await adminService.approvePartner(partnerId, token)
      setFeedback('Partner verified and approved successfully.')
      partners.reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  const updatePartner = async (partnerId, payload) => {
    try {
      await adminService.updatePartner(partnerId, payload, token)
      setFeedback('Partner details updated.')
      partners.reload()
    } catch (err) {
      setFeedback(err.message)
    }
  }

  return (
    <SectionCard title='Partner verification queue' subtitle='Review partner documents and approve them before their vehicle becomes visible to customers.'>
      <InlineMessage variant='error' text={partners.error} />
      <InlineMessage text={feedback} />
      <KycReviewBoard partners={pendingPartners} onApprove={review} onUpdate={updatePartner} />
    </SectionCard>
  )
}

export const AdminReportsPage = () => {
  const { token } = useAuth()
  const { data } = useResource(() => adminService.getDashboard(token), [token])

  return (
    <SectionCard title='Operational reports' subtitle='A lightweight reports surface for the MVP, with production hardening notes from the PDF.'>
      <div className='grid gap-4 xl:grid-cols-2'>
        <div className='panel-muted p-5 text-sm text-slate-300'>
          <p className='text-lg font-semibold text-white'>Current rollout snapshot</p>
          <div className='mt-4 space-y-2'>
            <p>Total users: {data?.stats.totalUsers ?? '--'}</p>
            <p>Total bookings: {data?.stats.totalBookings ?? '--'}</p>
            <p>Pending approvals: {data?.stats.pendingKyc ?? '--'}</p>
          </div>
        </div>
        <div className='panel-muted p-5 text-sm text-slate-300'>
          <p className='text-lg font-semibold text-white'>Next hardening priorities</p>
          <ul className='mt-4 space-y-2'>
            <li>Replace in-memory persistence with MongoDB + Mongoose.</li>
            <li>Introduce Redis-backed realtime event delivery.</li>
            <li>Complete partner document verification and approval workflows.</li>
            <li>Add automated tests for booking transitions and tracking validation.</li>
          </ul>
        </div>
      </div>
    </SectionCard>
  )
}
