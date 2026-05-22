const { assignPartnerSchema, updatePartnerByAdminSchema } = require("../validations/admin.validation");
const { sendSuccess } = require("../utils/response");
const { buildDashboard } = require("../services/admin.service");
const { assignPartner, listAdminBookings } = require("../services/booking.service");
const { User, PartnerProfile, Vehicle } = require("../models");
const { ApiError } = require("../utils/ApiError");

const getDashboard = async (_req, res) =>
  sendSuccess(res, { message: "Admin dashboard fetched", data: await buildDashboard() });

const getUsers = async (_req, res) =>
  sendSuccess(res, {
    message: "Users fetched",
    data: await User.find({ role: "customer" }).select("-passwordHash").sort({ createdAt: -1 }),
  });

const getPartners = async (_req, res) => {
  const profiles = await PartnerProfile.find().sort({ createdAt: -1 });
  const data = await Promise.all(
    profiles.map(async (profile) => ({
      ...profile.toObject(),
      user: await User.findById(profile.userId).select("-passwordHash"),
      vehicle: profile.vehicleId ? await Vehicle.findById(profile.vehicleId) : null,
    }))
  );

  return sendSuccess(res, { message: "Partners fetched", data });
};

const getBookings = async (_req, res) =>
  sendSuccess(res, { message: "Bookings fetched", data: await listAdminBookings() });

const approvePartner = async (req, res) => {
  const profile = await PartnerProfile.findOne({ userId: req.params.id });
  if (!profile) {
    throw new ApiError(404, "Partner profile not found", "PARTNER_PROFILE_NOT_FOUND");
  }
  profile.approvedByAdmin = true;
  profile.status = "OFFLINE";
  await profile.save();
  if (profile.vehicleId) {
    await Vehicle.findByIdAndUpdate(profile.vehicleId, { approvalStatus: "APPROVED" });
  }
  return sendSuccess(res, { message: "Partner approved", data: profile });
};

const updatePartnerByAdmin = async (req, res) => {
  const payload = updatePartnerByAdminSchema.parse(req.body);
  const [profile, user] = await Promise.all([
    PartnerProfile.findOne({ userId: req.params.id }),
    User.findOne({ _id: req.params.id, role: "partner" }),
  ]);

  if (!profile || !user) {
    throw new ApiError(404, "Partner profile not found", "PARTNER_PROFILE_NOT_FOUND");
  }

  if (payload.fullName !== undefined) user.fullName = payload.fullName;
  if (payload.email !== undefined) user.email = payload.email;
  if (payload.phone !== undefined) user.phone = payload.phone;

  if (payload.licenseNumber !== undefined) profile.licenseNumber = payload.licenseNumber;
  if (payload.serviceAreas !== undefined) profile.serviceAreas = payload.serviceAreas;
  if (payload.status !== undefined) profile.status = payload.status;
  if (payload.approvedByAdmin !== undefined) profile.approvedByAdmin = payload.approvedByAdmin;
  if (payload.videoKycRequested !== undefined) profile.videoKycRequested = payload.videoKycRequested;
  if (payload.reviewMessage !== undefined) profile.reviewMessage = payload.reviewMessage;
  if (payload.identityDocDetails !== undefined) profile.identityDocDetails = payload.identityDocDetails;

  await Promise.all([user.save(), profile.save()]);

  if (profile.vehicleId) {
    const vehicleUpdate = {};

    if (payload.approvedByAdmin !== undefined) {
      vehicleUpdate.approvalStatus = payload.approvedByAdmin ? "APPROVED" : "PENDING_APPROVAL";
    }

    if (payload.vehicleDocDetails !== undefined) {
      vehicleUpdate.documentDetails = payload.vehicleDocDetails;
    }

    if (Object.keys(vehicleUpdate).length > 0) {
      await Vehicle.findByIdAndUpdate(profile.vehicleId, vehicleUpdate);
    }
  }

  const vehicle = profile.vehicleId ? await Vehicle.findById(profile.vehicleId) : null;

  return sendSuccess(res, {
    message: "Partner updated",
    data: {
      ...profile.toObject(),
      user: user.toObject(),
      vehicle,
    },
  });
};

const assignBooking = async (req, res) => {
  const payload = assignPartnerSchema.parse(req.body);
  return sendSuccess(res, {
    message: "Partner assigned",
    data: await assignPartner({ bookingId: req.params.id, partnerId: payload.partnerId }),
  });
};

module.exports = {
  getDashboard,
  getUsers,
  getPartners,
  getBookings,
  approvePartner,
  updatePartnerByAdmin,
  assignBooking,
};
