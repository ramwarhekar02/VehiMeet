const { partnerLocationSchema } = require("../validations/partner.validation");
const { recordLocation, getLiveTracking, getTrackingHistory } = require("../services/tracking.service");
const { sendSuccess } = require("../utils/response");

const createLocation = async (req, res) => {
  const payload = partnerLocationSchema.parse(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Tracking location recorded",
    data: await recordLocation({ ...payload, partnerId: req.user.id }),
  });
};

const getLiveBookingTracking = async (req, res) =>
  sendSuccess(res, {
    message: "Live tracking fetched",
    data: await getLiveTracking(req.params.bookingId),
  });

const getBookingTrackingHistory = async (req, res) =>
  sendSuccess(res, {
    message: "Tracking history fetched",
    data: await getTrackingHistory(req.params.bookingId),
  });

module.exports = {
  createLocation,
  getLiveBookingTracking,
  getBookingTrackingHistory,
};
