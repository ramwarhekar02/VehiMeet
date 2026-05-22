import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { HomePage, VehiclesPage, VehicleDetailPage } from '../pages/public/PublicPages'
import {
  CustomerDashboardPage,
  CustomerBookingsPage,
  CustomerBookingDetailPage,
  CustomerTrackPage,
  CustomerProfilePage,
} from '../pages/customer/CustomerPages'
import {
  PartnerDashboardPage,
  PartnerBookingsPage,
  PartnerTrackingPage,
  PartnerVehiclePage,
  PartnerProfilePage,
} from '../pages/partner/PartnerPages'
import {
  AdminDashboardPage,
  AdminBookingsPage,
  AdminUsersPage,
  AdminPartnersPage,
  AdminKycPage,
  AdminReportsPage,
} from '../pages/admin/AdminPages'

export const AppRoutes = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path='/' element={<HomePage />} />
      <Route path='/vehicles' element={<VehiclesPage />} />
      <Route path='/vehicles/:id' element={<VehicleDetailPage />} />
      <Route path='/login' element={<Navigate to='/?auth=login' replace />} />
      <Route path='/register' element={<Navigate to='/?auth=signup' replace />} />

      <Route
        path='/dashboard'
        element={
          <ProtectedRoute allow={['customer']}>
            <CustomerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/dashboard/bookings'
        element={
          <ProtectedRoute allow={['customer']}>
            <CustomerBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/dashboard/bookings/:id'
        element={
          <ProtectedRoute allow={['customer']}>
            <CustomerBookingDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/dashboard/track/:bookingId'
        element={
          <ProtectedRoute allow={['customer']}>
            <CustomerTrackPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/dashboard/profile'
        element={
          <ProtectedRoute allow={['customer']}>
            <CustomerProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path='/partner/dashboard'
        element={
          <ProtectedRoute allow={['partner']}>
            <PartnerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/partner/bookings'
        element={
          <ProtectedRoute allow={['partner']}>
            <PartnerBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/partner/tracking'
        element={
          <ProtectedRoute allow={['partner']}>
            <PartnerTrackingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/partner/vehicle'
        element={
          <ProtectedRoute allow={['partner']}>
            <PartnerVehiclePage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/partner/profile'
        element={
          <ProtectedRoute allow={['partner']}>
            <PartnerProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path='/admin'
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin/bookings'
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin/users'
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin/partners'
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminPartnersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin/kyc'
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminKycPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin/reports'
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminReportsPage />
          </ProtectedRoute>
        }
      />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Route>
  </Routes>
)
