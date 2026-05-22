# VehiMeet (Full Stack)

VehiMeet is a full-stack web application for vehicle-related operations including authentication, booking, tracking, KYC, admin/partner/customers workflows, and real-time updates.

> Note: The frontend is built with Vite and the backend is Node.js/Express.

---

## Project Structure

- **frontend/**: React + Vite UI
  - `src/api/client.js` centralizes API base URL and request handling
- **backend/**: Express API
  - `src/config/env.js` centralizes backend environment configuration
  - `src/routes/*` defines API endpoints

---

## How backend URL configuration works (important)

### Frontend (API base URL)
All API requests from the frontend are made through:
- `frontend/src/api/client.js`

That file uses:
- `import.meta.env.VITE_API_BASE_URL`

✅ **So after deployment, if you change the backend URL, you only need to update `VITE_API_BASE_URL` and rebuild/redeploy the frontend build.**

You do **not** need to edit each file, because all requests flow through `apiClient`.

### Backend (server-side environment)
Backend configuration is read from environment variables via:
- `backend/src/config/env.js`

✅ Update deployment env vars (e.g., `PORT`, `CLIENT_ORIGIN`, `MONGO_URI`, etc.)—no code changes are required.

---

## Common scripts

### Backend
From `backend/`:
- `npm start` (as defined in `backend/package.json`)

### Frontend
From `frontend/`:
- `npm run dev`
- `npm run build`
- `npm run preview`

---

## Deployment notes

1. Deploy/set backend env vars (see `docs/ENVIRONMENT_VARIABLES.md` if available in your repo).
2. Set `VITE_API_BASE_URL` for the frontend build step.
3. Rebuild frontend so Vite can embed the correct API URL.

---

## Testing / Run locally

1. Start backend.
2. Start frontend.
3. Ensure browser cookies work with the configured `CLIENT_ORIGIN` and cookie settings.

---

## Documentation
- `docs/` contains additional architecture and API specs.

