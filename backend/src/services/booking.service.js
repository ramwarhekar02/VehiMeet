const { ApiError } = require("../utils/ApiError");
const { BOOKING_STATUS, KYC_STATUS, PARTNER_STATUS } = require("../constants/statuses");
const { createAppId } = require("../utils/id");
const { emitRealtime } = require("../lib/realtime");
const {
  User,
  CustomerProfile,
  PartnerProfile,
  Vehicle,
  VehicleCategory,
  Booking,
  KycSession,
} = require("../models");
const { isVehicleCustomerVisible } = require("./vehicle.service");

const fareFromCategory = (category, distanceKm, durationMin) => {
  const distanceFare = Number((distanceKm * category.perKmRate).toFixed(2));
  const timeFare = Number((durationMin * category.perMinuteRate).toFixed(2));
  const totalEstimatedFare = Number((category.baseFare + distanceFare + timeFare).toFixed(2));

  return {
    baseFare: category.baseFare,
    distanceFare,
    timeFare,
    surgeMultiplier: 1,
    totalEstimatedFare,
    finalFare: null,
  };
};

const mapDocument = (doc) => (doc?.toObject ? doc.toObject() : doc);

const toBookingUser = (user) =>
  user
    ? {
        id: user.id,
        _id: user._id,
        fullName: user.fullName,
      }
    : null;

const toBookingVehicle = (vehicle) => {
  if (!vehicle) return null;
  const source = mapDocument(vehicle);
  return {
    id: source.id || source._id,
    _id: source._id,
    brand: source.brand,
    model: source.model,
    seats: source.seats,
    fuelType: source.fuelType,
    color: source.color,
    images: source.images || [],
  };
};

const toBookingKycSession = (kycSession) => {
  if (!kycSession) return null;
  const source = mapDocument(kycSession);
  return {
    id: source.id || source._id,
    _id: source._id,
    status: source.status,
    reviewStatus: source.reviewStatus,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const getBookingDetails = async (bookingInput) => {
  const booking = mapDocument(bookingInput);
  const [customer, partner, vehicle, kycSession] = await Promise.all([
    User.findById(booking.customerId),
    booking.partnerId ? User.findById(booking.partnerId) : null,
    booking.vehicleId ? Vehicle.findById(booking.vehicleId) : null,
    KycSession.findOne({ bookingId: booking._id }).sort({ createdAt: -1 }),
  ]);

  return {
    ...booking,
    customer: toBookingUser(customer),
    partner: toBookingUser(partner),
    vehicle: toBookingVehicle(vehicle),
    kycSession: toBookingKycSession(kycSession),
  };
};

const listCustomerBookings = async (customerId) => {
  const bookings = await Booking.find({ customerId }).sort({ createdAt: -1 });
  return Promise.all(bookings.map(getBookingDetails));
};

const listPartnerBookings = async (partnerId) => {
  const bookings = await Booking.find({ partnerId }).sort({ createdAt: -1 });

  return Promise.all(bookings.map(getBookingDetails));
};

const listOpenPartnerBroadcastBookings = async () => {
  const bookings = await Booking.find({ status: BOOKING_STATUS.PENDING_ASSIGNMENT }).sort({ createdAt: -1 }).limit(6);

  return Promise.all(bookings.map(getBookingDetails));
};

const listAdminBookings = async () => {
  const bookings = await Booking.find().sort({ createdAt: -1 });
  return Promise.all(bookings.map(getBookingDetails));
};

const findBooking = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found", "BOOKING_NOT_FOUND");
  }
  return booking;
};

const assertStatus = (booking, allowedStatuses, action) => {
  if (!allowedStatuses.includes(booking.status)) {
    throw new ApiError(
      409,
      `Booking cannot be ${action} while in ${booking.status}`,
      "INVALID_BOOKING_TRANSITION",
    );
  }
};

const assertPartnerOwnsBooking = (booking, partnerId) => {
  if (!booking.partnerId || booking.partnerId !== partnerId) {
    throw new ApiError(403, "This booking is not assigned to this partner", "BOOKING_NOT_ASSIGNED_TO_PARTNER");
  }
};

const emitBookingRealtime = (event, bookingDetails) => {
  emitRealtime(event, {
    bookingId: bookingDetails.id || bookingDetails._id,
    customerId: bookingDetails.customerId,
    partnerId: bookingDetails.partnerId,
    status: bookingDetails.status,
    booking: bookingDetails,
  });
};

const createBooking = async ({
  customerId,
  vehicleId,
  pickup,
  drop,
  estimatedDistanceKm,
  estimatedDurationMin,
}) => {
  const [user, vehicle] = await Promise.all([
    User.findById(customerId),
    Vehicle.findOne({ _id: vehicleId, isActive: true }),
  ]);

  if (!user || user.isBlocked || !user.isActive) {
    throw new ApiError(403, "Customer account cannot create bookings", "CUSTOMER_BLOCKED");
  }

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not available", "VEHICLE_UNAVAILABLE");
  }

  if (!(await isVehicleCustomerVisible(vehicle))) {
    throw new ApiError(403, "Vehicle is not approved for customer bookings", "VEHICLE_NOT_APPROVED");
  }

  const category = await VehicleCategory.findById(vehicle.categoryId);
  if (!category || !category.isActive) {
    throw new ApiError(404, "Vehicle category not available", "CATEGORY_NOT_FOUND");
  }

  const pricing = fareFromCategory(category, estimatedDistanceKm, estimatedDurationMin);
  const booking = await Booking.create({
    _id: createAppId("book"),
    bookingCode: `VM-${1000 + (await Booking.countDocuments()) + 1}`,
    customerId,
    partnerId: null,
    vehicleId: vehicle._id,
    vehicleSnapshot: {
      brand: vehicle.brand,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      categoryName: category.name,
    },
    pickup,
    drop,
    routeInfo: {
      estimatedDistanceKm,
      estimatedDurationMin,
      polyline: "",
    },
    pricing,
    status: BOOKING_STATUS.PENDING_ASSIGNMENT,
    kycStatus: KYC_STATUS.VERIFIED,
    assignedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
  });

  const details = await getBookingDetails(booking);
  emitBookingRealtime("booking:created", details);
  return details;
};

const cancelBooking = async ({ bookingId, actorRole, reason }) => {
  const booking = await findBooking(bookingId);
  assertStatus(
    booking,
    [
      BOOKING_STATUS.DRAFT,
      BOOKING_STATUS.PENDING_KYC,
      BOOKING_STATUS.KYC_IN_PROGRESS,
      BOOKING_STATUS.KYC_VERIFIED,
      BOOKING_STATUS.PENDING_ASSIGNMENT,
      BOOKING_STATUS.ASSIGNED,
      BOOKING_STATUS.PARTNER_EN_ROUTE,
      BOOKING_STATUS.ARRIVED,
    ],
    "cancelled",
  );
  booking.status =
    actorRole === "admin"
      ? BOOKING_STATUS.CANCELLED_BY_ADMIN
      : actorRole === "partner"
        ? BOOKING_STATUS.CANCELLED_BY_PARTNER
        : BOOKING_STATUS.CANCELLED_BY_USER;
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason || "Cancelled by requester";
  await booking.save();
  const details = await getBookingDetails(booking);
  emitBookingRealtime("booking:updated", details);
  return details;
};

const assignPartner = async ({ bookingId, partnerId }) => {
  const [booking, partner, profile] = await Promise.all([
    findBooking(bookingId),
    User.findOne({ _id: partnerId, role: "partner" }),
    PartnerProfile.findOne({ userId: partnerId }),
  ]);

  if (!partner || !profile) {
    throw new ApiError(404, "Partner not found", "PARTNER_NOT_FOUND");
  }

  if (!profile.approvedByAdmin || profile.status === PARTNER_STATUS.SUSPENDED) {
    throw new ApiError(409, "Partner is not eligible for assignment", "PARTNER_NOT_APPROVED");
  }
  if (profile.status !== PARTNER_STATUS.ONLINE) {
    throw new ApiError(409, "Partner must be online before assignment", "PARTNER_NOT_ONLINE");
  }
  assertStatus(booking, [BOOKING_STATUS.PENDING_ASSIGNMENT], "assigned");

  const now = new Date();
  booking.partnerId = partnerId;
  booking.status = BOOKING_STATUS.ASSIGNED;
  booking.assignedAt = now;
  await booking.save();

  profile.status = PARTNER_STATUS.BUSY;
  await profile.save();
  const details = await getBookingDetails(booking);
  emitBookingRealtime("partner:assigned", details);
  emitBookingRealtime("booking:updated", details);
  return details;
};

const acceptBooking = async ({ bookingId, partnerId }) => {
  const [booking, profile] = await Promise.all([
    findBooking(bookingId),
    PartnerProfile.findOne({ userId: partnerId }),
  ]);
  if (!profile || !profile.approvedByAdmin || profile.status === PARTNER_STATUS.SUSPENDED) {
    throw new ApiError(409, "Partner is not eligible to accept bookings", "PARTNER_NOT_APPROVED");
  }
  if (!booking.partnerId && profile.status !== PARTNER_STATUS.ONLINE) {
    throw new ApiError(409, "Partner must be online before accepting open bookings", "PARTNER_NOT_ONLINE");
  }
  if (booking.partnerId && booking.partnerId !== partnerId) {
    throw new ApiError(409, "This booking is already assigned to another partner", "BOOKING_ALREADY_ASSIGNED");
  }
  assertStatus(booking, [BOOKING_STATUS.PENDING_ASSIGNMENT, BOOKING_STATUS.ASSIGNED], "accepted");

  booking.partnerId = partnerId;
  booking.status = BOOKING_STATUS.PARTNER_EN_ROUTE;
  booking.assignedAt = booking.assignedAt || new Date();
  await booking.save();
  profile.status = PARTNER_STATUS.BUSY;
  await profile.save();
  const details = await getBookingDetails(booking);
  emitBookingRealtime("booking:updated", details);
  return details;
};

const rejectBooking = async ({ bookingId, partnerId }) => {
  const booking = await findBooking(bookingId);

  if (booking.partnerId !== partnerId) {
    throw new ApiError(409, "This booking is not assigned to this partner", "BOOKING_NOT_ASSIGNED_TO_PARTNER");
  }
  assertStatus(booking, [BOOKING_STATUS.ASSIGNED], "rejected");

  booking.partnerId = null;
  booking.status = BOOKING_STATUS.PENDING_ASSIGNMENT;
  booking.assignedAt = null;
  await booking.save();

  const profile = await PartnerProfile.findOne({ userId: partnerId });
  if (profile) {
    profile.status = PARTNER_STATUS.ONLINE;
    await profile.save();
  }

  const details = await getBookingDetails(booking);
  emitBookingRealtime("booking:updated", details);
  return details;
};

const arriveAtPickup = async ({ bookingId, partnerId }) => {
  const booking = await findBooking(bookingId);
  assertPartnerOwnsBooking(booking, partnerId);
  assertStatus(booking, [BOOKING_STATUS.PARTNER_EN_ROUTE], "marked arrived");
  booking.status = BOOKING_STATUS.ARRIVED;
  await booking.save();
  const details = await getBookingDetails(booking);
  emitBookingRealtime("booking:updated", details);
  return details;
};

const startTrip = async ({ bookingId, partnerId }) => {
  const booking = await findBooking(bookingId);
  assertPartnerOwnsBooking(booking, partnerId);
  assertStatus(booking, [BOOKING_STATUS.ARRIVED], "started");
  booking.status = BOOKING_STATUS.TRIP_STARTED;
  booking.startedAt = new Date();
  await booking.save();
  const details = await getBookingDetails(booking);
  emitBookingRealtime("booking:updated", details);
  return details;
};

const completeTrip = async ({ bookingId, partnerId }) => {
  const booking = await findBooking(bookingId);
  assertPartnerOwnsBooking(booking, partnerId);
  assertStatus(booking, [BOOKING_STATUS.TRIP_STARTED], "completed");
  booking.status = BOOKING_STATUS.TRIP_COMPLETED;
  booking.completedAt = new Date();
  booking.pricing.finalFare = booking.pricing.totalEstimatedFare;
  await booking.save();

  if (booking.partnerId) {
    const profile = await PartnerProfile.findOne({ userId: booking.partnerId });
    if (profile) {
      profile.status = PARTNER_STATUS.ONLINE;
      profile.totalTrips += 1;
      await profile.save();
    }
  }

  const details = await getBookingDetails(booking);
  emitBookingRealtime("booking:updated", details);
  return details;
};

const updateCustomerProfile = async ({ userId, fullName, phone, emergencyContact }) => {
  const user = await User.findById(userId);
  const profile = await CustomerProfile.findOne({ userId });

  if (!user || !profile) {
    throw new ApiError(404, "Customer profile not found", "CUSTOMER_PROFILE_NOT_FOUND");
  }

  user.fullName = fullName;
  user.phone = phone;
  await user.save();

  if (emergencyContact) {
    profile.emergencyContact = {
      name: emergencyContact.name || "",
      phone: emergencyContact.phone || emergencyContact,
    };
  }
  await profile.save();

  return { user, profile };
};

module.exports = {
  getBookingDetails,
  listCustomerBookings,
  listPartnerBookings,
  listOpenPartnerBroadcastBookings,
  listAdminBookings,
  findBooking,
  createBooking,
  cancelBooking,
  assignPartner,
  acceptBooking,
  rejectBooking,
  arriveAtPickup,
  startTrip,
  completeTrip,
  updateCustomerProfile,
};
