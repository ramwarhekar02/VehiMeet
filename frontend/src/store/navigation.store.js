export const roleNavigation = {
  guest: [
    { label: 'Home', to: '/' },
    { label: 'Login', to: '/?auth=login' },
  ],
  customer: [
    { label: 'Home', to: '/' },
    { label: 'Vehicles', to: '/vehicles' },
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Bookings', to: '/dashboard/bookings' },
    { label: 'Profile', to: '/dashboard/profile' },
  ],
  partner: [
    { label: 'Dashboard', to: '/partner/dashboard' },
    { label: 'History', to: '/partner/bookings' },
    { label: 'Tracking', to: '/partner/tracking' },
    { label: 'Vehicle', to: '/partner/vehicle' },
    { label: 'Profile', to: '/partner/profile' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin' },
    { label: 'Bookings', to: '/admin/bookings' },
    { label: 'Users', to: '/admin/users' },
    { label: 'Partners', to: '/admin/partners' },
    { label: 'KYC', to: '/admin/kyc' },
    { label: 'Reports', to: '/admin/reports' },
  ],
}
