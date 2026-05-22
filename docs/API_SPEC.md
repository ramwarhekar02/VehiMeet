# API_SPEC

## Auth
- `POST /api/auth/register`
- `POST /api/auth/bootstrap-admin`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

## Customer
- `GET /api/customer/profile`
- `PATCH /api/customer/profile`
- `GET /api/customer/bookings`
- `POST /api/customer/bookings`
- `GET /api/customer/bookings/:id`
- `POST /api/customer/bookings/:id/cancel`

## Partner
- `GET /api/partner/profile`
- `PATCH /api/partner/profile`
- `PUT /api/partner/vehicle`
- `PATCH /api/partner/status`
- `PATCH /api/partner/location`
- `GET /api/partner/bookings/assigned`
- `POST /api/partner/bookings/:id/accept`
- `POST /api/partner/bookings/:id/reject`
- `POST /api/partner/bookings/:id/arrive`
- `POST /api/partner/bookings/:id/start`
- `POST /api/partner/bookings/:id/complete`

## Admin and Ops
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/partners`
- `GET /api/admin/bookings`
- `POST /api/admin/partners/:id/approve`
- `POST /api/admin/bookings/:id/assign`
- `POST /api/kyc/session/create`
- `GET /api/kyc/session/:id`
- `POST /api/admin/kyc/:id/review`
- `GET /api/tracking/booking/:bookingId/live`
- `GET /api/events/stream`
