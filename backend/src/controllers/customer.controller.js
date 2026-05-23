const { bookingSchema, profileUpdateSchema } = require("../validations/customer.validation");
const { ApiError } = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { CustomerProfile } = require("../models");
const {
  createBooking,
  listCustomerBookings,
  findBooking,
  cancelBooking,
  getBookingDetails,
  updateCustomerProfile,
} = require("../services/booking.service");

const getProfile = async (req, res) => {
  const profile = await CustomerProfile.findOne({ userId: req.user.id });
  if (!profile) {
    throw new ApiError(404, "Customer profile not found", "CUSTOMER_PROFILE_NOT_FOUND");
  }
  return sendSuccess(res, {
    message: "Customer profile fetched",
    data: {
      user: {
        id: req.user.id,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
      },
      profile,
    },
  });
};

const updateProfile = async (req, res) => {
  const payload = profileUpdateSchema.parse(req.body);
  const data = await updateCustomerProfile({
    userId: req.user.id,
    ...payload,
  });
  return sendSuccess(res, { message: "Customer profile updated", data });
};

const getBookings = async (req, res) =>
  sendSuccess(res, {
    message: "Customer bookings fetched",
    data: await listCustomerBookings(req.user.id),
  });

const createNewBooking = async (req, res) => {
  const payload = bookingSchema.parse(req.body);
  await createBooking({ customerId: req.user.id, ...payload });
  return sendSuccess(res, { statusCode: 201, message: "Booking created", data: null });
};

const getBooking = async (req, res) => {
  const booking = await findBooking(req.params.id);
  if (booking.customerId !== req.user.id && req.user.role !== "admin") {
    throw new ApiError(403, "This booking does not belong to you", "BOOKING_FORBIDDEN");
  }
  return sendSuccess(res, { message: "Booking fetched", data: await getBookingDetails(booking) });
};

const cancelCustomerBooking = async (req, res) => {
  const booking = await findBooking(req.params.id);
  if (booking.customerId !== req.user.id) {
    throw new ApiError(403, "This booking does not belong to you", "BOOKING_FORBIDDEN");
  }
  await cancelBooking({
      bookingId: req.params.id,
      actorRole: "customer",
      reason: req.body.reason,
    });
  return sendSuccess(res, { message: "Booking cancelled", data: null });
};

module.exports = {
  getProfile,
  updateProfile,
  getBookings,
  createNewBooking,
  getBooking,
  cancelCustomerBooking,
};
