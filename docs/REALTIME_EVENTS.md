# REALTIME_EVENTS

## Client to Server
- `partner:goOnline`
- `partner:updateLocation`
- `booking:subscribe`
- `booking:unsubscribe`
- `kyc:joinRoom`

## Server to Client
- `booking:updated`
- `partner:assigned`
- `tracking:location`
- `tracking:etaUpdated`
- `kyc:statusChanged`
- `partner:statusChanged`
- `realtime:ready`

## Rooms
- `booking:{bookingId}`
- `user:{userId}`
- `partner:{partnerId}`
- `admin:dashboard`
- `kyc:{sessionId}`

## Transport
- Primary realtime transport uses Socket.IO on the backend HTTP server.
- Auth uses the same JWT passed in `socket.handshake.auth.token`.
- `GET /api/events/stream` remains available as a server-sent events fallback.
- Tracking uses the in-process realtime bus for free local development. Redis/Kafka can be added later for multi-server scale.

## Free Tracking Intelligence
- Automatic GPS streaming uses the browser Geolocation `watchPosition` API from the partner tracking page.
- ETA and remaining distance use OSRM when `OSRM_BASE_URL` is reachable.
- Map snapping uses OSRM nearest-road lookup when available.
- If OSRM is down or rate limited, tracking falls back to haversine distance and city-speed ETA.
