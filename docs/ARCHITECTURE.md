# ARCHITECTURE

## Frontend
The frontend is a React application with role-based routing, a shared shell, reusable UI primitives, and grouped pages for public, customer, partner, and admin workflows.

## Backend
The backend is an Express API with:
- Config and environment handling
- Constants for roles and statuses
- Route modules by domain
- Controllers for HTTP orchestration
- Services for business rules
- Validation with Zod
- Global error handling and response envelopes

## Main Business Modules
- Auth
- Vehicles
- Customer bookings
- Partner operations
- KYC lifecycle
- Tracking
- Admin operations
