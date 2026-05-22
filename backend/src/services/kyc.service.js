const { ApiError } = require("../utils/ApiError");
const { BOOKING_STATUS, KYC_STATUS } = require("../constants/statuses");
const { createAppId } = require("../utils/id");
const { emitRealtime } = require("../lib/realtime");
const { Booking, KycSession, CustomerProfile } = require("../models");

const createSession = async ({ bookingId, customerId }) => {
  const existing = await KycSession.findOne({
    bookingId,
    status: { $in: [KYC_STATUS.SCHEDULED, KYC_STATUS.IN_PROGRESS] },
  });

  if (existing) {
    throw new ApiError(409, "Only one active KYC session is allowed per booking", "KYC_ALREADY_ACTIVE");
  }

  const now = new Date();
  const session = await KycSession.create({
    _id: createAppId("kyc"),
    bookingId,
    customerId,
    status: KYC_STATUS.SCHEDULED,
    zegoRoomId: `room-${bookingId}-${Date.now()}`,
    zegoSessionId: `zego-${bookingId}-${Date.now()}`,
    scheduledAt: now,
    startedAt: null,
    completedAt: null,
    reviewedBy: null,
    reviewNotes: "",
    result: null,
    evidenceFiles: [],
  });

  const booking = await Booking.findById(bookingId);
  if (booking) {
    booking.kycStatus = KYC_STATUS.SCHEDULED;
    await booking.save();
  }

  emitRealtime("kyc:statusChanged", {
    kycSessionId: session.id,
    bookingId,
    customerId,
    status: session.status,
    session,
  });

  return session;
};

const findSession = async (sessionId) => {
  const session = await KycSession.findById(sessionId);
  if (!session) {
    throw new ApiError(404, "KYC session not found", "KYC_NOT_FOUND");
  }
  return session;
};

const startSession = async (sessionId) => {
  const session = await findSession(sessionId);
  session.status = KYC_STATUS.IN_PROGRESS;
  session.startedAt = new Date();
  await session.save();

  const booking = await Booking.findById(session.bookingId);
  if (booking) {
    booking.status = BOOKING_STATUS.KYC_IN_PROGRESS;
    booking.kycStatus = KYC_STATUS.IN_PROGRESS;
    await booking.save();
  }

  emitRealtime("kyc:statusChanged", {
    kycSessionId: session.id,
    bookingId: session.bookingId,
    customerId: session.customerId,
    status: session.status,
    session,
  });

  return session;
};

const completeSession = async (sessionId, evidenceFiles = []) => {
  const session = await findSession(sessionId);
  session.completedAt = new Date();
  session.evidenceFiles = evidenceFiles;
  await session.save();
  emitRealtime("kyc:statusChanged", {
    kycSessionId: session.id,
    bookingId: session.bookingId,
    customerId: session.customerId,
    status: session.status,
    session,
  });
  return session;
};

const reviewSession = async ({ sessionId, reviewerId, result, reviewNotes }) => {
  const session = await findSession(sessionId);
  session.reviewedBy = reviewerId;
  session.result = result;
  session.reviewNotes = reviewNotes || "";
  session.status = result === "VERIFIED" ? KYC_STATUS.VERIFIED : KYC_STATUS.REJECTED;
  session.completedAt = session.completedAt || new Date();
  await session.save();

  const [booking, profile] = await Promise.all([
    Booking.findById(session.bookingId),
    CustomerProfile.findOne({ userId: session.customerId }),
  ]);

  if (booking) {
    booking.kycStatus = session.status;
    booking.status =
      result === "VERIFIED" ? BOOKING_STATUS.PENDING_ASSIGNMENT : BOOKING_STATUS.KYC_REJECTED;
    await booking.save();
  }

  if (profile) {
    profile.kycStatus = session.status;
    profile.lastKycId = session._id;
    await profile.save();
  }

  emitRealtime("kyc:statusChanged", {
    kycSessionId: session.id,
    bookingId: session.bookingId,
    customerId: session.customerId,
    status: session.status,
    session,
  });

  return session;
};

module.exports = { createSession, findSession, startSession, completeSession, reviewSession };
