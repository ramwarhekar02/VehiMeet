const { ApiError } = require("../utils/ApiError");
const { createAppId } = require("../utils/id");
const { emitRealtime } = require("../lib/realtime");
const { osrmBaseUrl } = require("../config/env");
const { BOOKING_STATUS } = require("../constants/statuses");
const { Booking, LocationUpdate, PartnerProfile } = require("../models");

const DEFAULT_CITY_SPEED_KMPH = 28;
const OSRM_TIMEOUT_MS = 2500;

const mapLocationDoc = (doc) => {
  if (!doc) return null;
  const item = doc.toObject ? doc.toObject() : doc;
  const [lng, lat] = item.location?.coordinates || [];

  return {
    ...item,
    location: {
      ...item.location,
      lat,
      lng,
    },
    snappedLocation: item.snappedLocation?.coordinates?.length
      ? {
          ...item.snappedLocation,
          lat: item.snappedLocation.coordinates[1],
          lng: item.snappedLocation.coordinates[0],
        }
      : null,
  };
};

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const haversineKm = (from, to) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fetchJsonWithTimeout = async (url) => {
  if (!global.fetch || !osrmBaseUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const getTrackingTarget = (booking) => {
  if (!booking) return null;
  if ([BOOKING_STATUS.PARTNER_EN_ROUTE, BOOKING_STATUS.ARRIVED].includes(booking.status)) {
    return booking.pickup;
  }
  if (booking.status === BOOKING_STATUS.TRIP_STARTED) {
    return booking.drop;
  }
  return booking.drop || booking.pickup;
};

const getOsrmRouteMetrics = async ({ current, target }) => {
  const baseUrl = osrmBaseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/route/v1/driving/${current.lng},${current.lat};${target.lng},${target.lat}?overview=false&alternatives=false&steps=false`;
  const data = await fetchJsonWithTimeout(url);
  const route = data?.routes?.[0];
  if (!route) return null;

  return {
    etaSeconds: Math.round(route.duration),
    distanceRemainingKm: Number((route.distance / 1000).toFixed(2)),
    routeProvider: "OSRM",
  };
};

const getOsrmSnappedLocation = async ({ lat, lng }) => {
  const baseUrl = osrmBaseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/nearest/v1/driving/${lng},${lat}?number=1`;
  const data = await fetchJsonWithTimeout(url);
  const location = data?.waypoints?.[0]?.location;
  if (!Array.isArray(location) || location.length !== 2) return null;

  return {
    type: "Point",
    coordinates: [location[0], location[1]],
  };
};

const buildFallbackRouteMetrics = ({ current, target, speed }) => {
  const distanceRemainingKm = Number(haversineKm(current, target).toFixed(2));
  const effectiveSpeed = Math.max(Number(speed || 0), DEFAULT_CITY_SPEED_KMPH);
  return {
    etaSeconds: Math.round((distanceRemainingKm / effectiveSpeed) * 60 * 60),
    distanceRemainingKm,
    routeProvider: "HAVERSINE",
  };
};

const buildTrackingIntelligence = async ({ bookingId, lat, lng, speed }) => {
  const booking = bookingId ? await Booking.findById(bookingId) : null;
  const target = getTrackingTarget(booking);
  if (!target) {
    return {
      snappedLocation: null,
      etaSeconds: null,
      distanceRemainingKm: null,
      routeProvider: "RAW",
    };
  }

  const current = { lat, lng };
  const [snappedLocation, osrmMetrics] = await Promise.all([
    getOsrmSnappedLocation(current),
    getOsrmRouteMetrics({ current, target }),
  ]);

  return {
    snappedLocation,
    ...(osrmMetrics || buildFallbackRouteMetrics({ current, target, speed })),
  };
};

const validateTrackingPayload = ({ lat, lng, timestamp }) => {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, "Coordinates are outside the valid range", "INVALID_COORDINATES");
  }

  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (Number.isNaN(ageMs) || ageMs > 1000 * 60 * 5) {
    throw new ApiError(400, "Location timestamp is too old", "STALE_LOCATION");
  }
};

const recordLocation = async ({ bookingId, partnerId, lat, lng, speed, heading, accuracy, timestamp }) => {
  validateTrackingPayload({ lat, lng, timestamp });
  const intelligence = await buildTrackingIntelligence({ bookingId, lat, lng, speed });

  const update = await LocationUpdate.create({
    _id: createAppId("loc"),
    bookingId,
    partnerId,
    location: {
      type: "Point",
      coordinates: [lng, lat],
    },
    speed,
    heading,
    accuracy,
    snappedLocation: intelligence.snappedLocation,
    etaSeconds: intelligence.etaSeconds,
    distanceRemainingKm: intelligence.distanceRemainingKm,
    routeProvider: intelligence.routeProvider,
    timestamp: new Date(timestamp),
  });

  const profile = await PartnerProfile.findOne({ userId: partnerId });
  if (profile) {
    profile.currentLocation = {
      type: "Point",
      coordinates: [lng, lat],
    };
    await profile.save();
  }

  emitRealtime("tracking:location", { bookingId, partnerId, location: mapLocationDoc(update) });
  return mapLocationDoc(update);
};

const getTrackingHistory = async (bookingId) => {
  const items = await LocationUpdate.find({ bookingId }).sort({ timestamp: 1 });
  return items.map(mapLocationDoc);
};

const getLiveTracking = async (bookingId) => {
  const item = await LocationUpdate.findOne({ bookingId }).sort({ timestamp: -1 });
  return mapLocationDoc(item);
};

module.exports = { recordLocation, getTrackingHistory, getLiveTracking };
