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

const toPartnerUserResponse = (user) => ({
  id: user.id,
  role: user.role,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
});

const toPartnerProfileResponse = (profile) => ({
  id: profile.id,
  status: profile.status,
  licenseNumber: profile.licenseNumber,
  serviceAreas: profile.serviceAreas,
  approvedByAdmin: profile.approvedByAdmin,
  videoKycRequested: profile.videoKycRequested,
  reviewMessage: profile.reviewMessage,
  identityDocs: profile.identityDocs,
  identityDocDetails: profile.identityDocDetails,
});

const toPartnerVehicleResponse = (vehicle) => {
  if (!vehicle) return null;
  return {
    id: vehicle.id,
    categoryId: vehicle.categoryId,
    brand: vehicle.brand,
    model: vehicle.model,
    plateNumber: vehicle.plateNumber,
    seats: vehicle.seats,
    fuelType: vehicle.fuelType,
    color: vehicle.color,
    images: vehicle.images,
    documents: vehicle.documents,
    documentDetails: vehicle.documentDetails,
    approvalStatus: vehicle.approvalStatus,
  };
};

const getProfile = async (req, res) => {
  const profile = await PartnerProfile.findOne({ userId: req.user.id });
  if (!profile) {
    throw new ApiError(404, "Partner profile not found", "PARTNER_PROFILE_NOT_FOUND");
  }
  const vehicle = profile?.vehicleId ? await Vehicle.findById(profile.vehicleId) : null;
  return sendSuccess(res, {
    message: "Partner profile fetched",
    data: {
      user: toPartnerUserResponse(req.user),
      profile: toPartnerProfileResponse(profile),
      vehicle: toPartnerVehicleResponse(vehicle),
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
    data: null,
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
  return sendSuccess(res, { message: "Partner status updated", data: null });
};

const upsertVehicle = async (req, res) => {
  const payload = partnerVehicleUpsertSchema.parse(req.body);
  await upsertPartnerVehicle({ partnerId: req.user.id, payload });
  return sendSuccess(res, {
    message: "Vehicle submitted for admin review",
    data: null,
  });
};

const updateLocation = async (req, res) => {
  const payload = partnerLocationSchema.parse(req.body);
  await recordLocation({ ...payload, partnerId: req.user.id });
  return sendSuccess(res, { statusCode: 201, message: "Partner location updated", data: null });
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

const acceptAssignedBooking = async (req, res) => {
  await acceptBooking({ bookingId: req.params.id, partnerId: req.user.id });
  return sendSuccess(res, { message: "Booking accepted", data: null });
};

const rejectAssignedBooking = async (req, res) => {
  await rejectBooking({ bookingId: req.params.id, partnerId: req.user.id });
  return sendSuccess(res, { message: "Booking sent back to dispatch queue", data: null });
};

const startAssignedTrip = async (req, res) => {
  await startTrip({ bookingId: req.params.id, partnerId: req.user.id });
  return sendSuccess(res, { message: "Trip started", data: null });
};

const markArrivedAtPickup = async (req, res) => {
  await arriveAtPickup({ bookingId: req.params.id, partnerId: req.user.id });
  return sendSuccess(res, { message: "Partner arrived at pickup", data: null });
};

const completeAssignedTrip = async (req, res) => {
  await completeTrip({ bookingId: req.params.id, partnerId: req.user.id });
  return sendSuccess(res, { message: "Trip completed", data: null });
};

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
