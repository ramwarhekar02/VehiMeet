# DATABASE_SCHEMA

## Core Collections
- `users`
- `customer_profiles`
- `partner_profiles`
- `vehicles`
- `vehicle_categories`
- `bookings`
- `kyc_sessions`
- `location_updates`
- `notifications`
- `audit_logs`

## Important Relationships
- `customer_profiles.userId -> users.id`
- `partner_profiles.userId -> users.id`
- `vehicles.partnerId -> users.id`
- `bookings.customerId -> users.id`
- `bookings.partnerId -> users.id`
- `kyc_sessions.bookingId -> bookings.id`
- `location_updates.bookingId -> bookings.id`

## Indexing Guidance
- Unique email and phone on `users`
- Geospatial index on partner location
- Compound indexes for booking history and partner work queues
