const {
  partnerStatusSchema,
  partnerProfileUpdateSchema,
  partnerVehicleUpsertSchema,
  partnerLocationSchema,
} = require("../validations/partner.validation");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/ApiError");
const { PartnerProfile, Vehicle, User } = require("../models");
const {
  listPartnerBookings,
  listOpenPartnerBroadcastBookings,
  acceptBooking,
  rejectBooking,
  arriveAtPickup,
  startTrip,
  completeTrip,
} = require("../services/booking.service");
const { recordLocation } = require("../services/tracking.service");
const { upsertPartnerVehicle } = require("../services/vehicle.service");

const getProfile = async (req, res) => {
  const profile = await PartnerProfile.findOne({ userId: req.user.id });
  if (!profile) {
    throw new ApiError(404, "Partner profile not found", "PARTNER_PROFILE_NOT_FOUND");
  }
  return sendSuccess(res, {
    message: "Partner profile fetched",
    data: {
      user: req.user,
      profile,
      vehicle: profile?.vehicleId ? await Vehicle.findById(profile.vehicleId) : null,
    },
  });
};

const updateProfile = async (req, res) => {
  const payload = partnerProfileUpdateSchema.parse(req.body);
  const [profile, user] = await Promise.all([
    PartnerProfile.findOne({ userId: req.user.id }),
    User.findById(req.user.id),
  ]);
  if (!profile || !user) {
    throw new ApiError(404, "Partner profile not found", "PARTNER_PROFILE_NOT_FOUND");
  }
  if (payload.fullName !== undefined) {
    user.fullName = payload.fullName;
  }
  if (payload.email !== undefined) {
    user.email = payload.email;
  }
  if (payload.phone !== undefined) {
    user.phone = payload.phone;
  }
  if (payload.avatarUrl !== undefined) {
    user.avatarUrl = payload.avatarUrl;
  }
  if (payload.serviceAreas !== undefined) {
    profile.serviceAreas = payload.serviceAreas;
  }
  if (payload.licenseNumber !== undefined) {
    profile.licenseNumber = payload.licenseNumber;
  }
  if (payload.identityDocDetails !== undefined) {
    profile.identityDocDetails = payload.identityDocDetails;
  }
  profile.approvedByAdmin = false;
  if (profile.status !== "SUSPENDED") {
    profile.status = "PENDING_APPROVAL";
  }
  await Promise.all([user.save(), profile.save()]);
  return sendSuccess(res, {
    message: "Partner profile submitted for admin review",
    data: {
      user,
      profile,
    },
  });
};

const updateStatus = async (req, res) => {
  const payload = partnerStatusSchema.parse(req.body);
  const profile = await PartnerProfile.findOne({ userId: req.user.id });
  if (!profile) {
    throw new ApiError(404, "Partner profile not found", "PARTNER_PROFILE_NOT_FOUND");
  }
  if (payload.status === "ONLINE" && (!profile.approvedByAdmin || !profile.vehicleId)) {
    throw new ApiError(409, "Complete partner and vehicle approval before going online", "PARTNER_NOT_READY");
  }
  profile.status = payload.status;
  await profile.save();
  return sendSuccess(res, { message: "Partner status updated", data: profile });
};

const upsertVehicle = async (req, res) => {
  const payload = partnerVehicleUpsertSchema.parse(req.body);
  return sendSuccess(res, {
    message: "Vehicle submitted for admin review",
    data: await upsertPartnerVehicle({ partnerId: req.user.id, payload }),
  });
};

const updateLocation = async (req, res) => {
  const payload = partnerLocationSchema.parse(req.body);
  const location = await recordLocation({ ...payload, partnerId: req.user.id });
  return sendSuccess(res, { statusCode: 201, message: "Partner location updated", data: location });
};

const getAssignedBookings = async (req, res) =>
  sendSuccess(res, {
    message: "Partner bookings fetched",
    data: await listPartnerBookings(req.user.id),
  });

const getBroadcastBookings = async (_req, res) =>
  sendSuccess(res, {
    message: "Open dispatch bookings fetched",
    data: await listOpenPartnerBroadcastBookings(),
  });

const acceptAssignedBooking = async (req, res) =>
  sendSuccess(res, {
    message: "Booking accepted",
    data: await acceptBooking({ bookingId: req.params.id, partnerId: req.user.id }),
  });

const rejectAssignedBooking = async (req, res) =>
  sendSuccess(res, {
    message: "Booking sent back to dispatch queue",
    data: await rejectBooking({ bookingId: req.params.id, partnerId: req.user.id }),
  });

const startAssignedTrip = async (req, res) =>
  sendSuccess(res, {
    message: "Trip started",
    data: await startTrip({ bookingId: req.params.id, partnerId: req.user.id }),
  });

const markArrivedAtPickup = async (req, res) =>
  sendSuccess(res, {
    message: "Partner arrived at pickup",
    data: await arriveAtPickup({ bookingId: req.params.id, partnerId: req.user.id }),
  });

const completeAssignedTrip = async (req, res) =>
  sendSuccess(res, {
    message: "Trip completed",
    data: await completeTrip({ bookingId: req.params.id, partnerId: req.user.id }),
  });

module.exports = {
  getProfile,
  updateProfile,
  updateStatus,
  upsertVehicle,
  updateLocation,
  getAssignedBookings,
  getBroadcastBookings,
  acceptAssignedBooking,
  rejectAssignedBooking,
  markArrivedAtPickup,
  startAssignedTrip,
  completeAssignedTrip,
};
