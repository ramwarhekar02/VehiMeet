const { User, Vehicle, Booking, PartnerProfile } = require("../models");
const { BOOKING_STATUS, PARTNER_STATUS } = require("../constants/statuses");
const { listAdminBookings } = require("./booking.service");

const buildDashboard = async () => {
  const [bookings, totalUsers, totalVehicles, totalBookings, pendingPartnerApprovals, onlinePartners] =
    await Promise.all([
      listAdminBookings(),
      User.countDocuments(),
      Vehicle.countDocuments(),
      Booking.countDocuments(),
      PartnerProfile.countDocuments({ approvedByAdmin: false }),
      PartnerProfile.countDocuments({ status: PARTNER_STATUS.ONLINE }),
    ]);

  const activeTrips = bookings.filter((item) =>
    [
      BOOKING_STATUS.ASSIGNED,
      BOOKING_STATUS.PARTNER_EN_ROUTE,
      BOOKING_STATUS.ARRIVED,
      BOOKING_STATUS.TRIP_STARTED,
    ].includes(item.status)
  ).length;

  return {
    stats: {
      totalUsers,
      totalVehicles,
      totalBookings,
      activeTrips,
      pendingKyc: pendingPartnerApprovals,
      onlinePartners,
    },
    recentBookings: bookings.slice(0, 5),
  };
};

module.exports = { buildDashboard };
