const seed = require("./seed");
const {
  User,
  CustomerProfile,
  PartnerProfile,
  VehicleCategory,
  Vehicle,
  Booking,
  KycSession,
  LocationUpdate,
  Notification,
  AuditLog,
} = require("../models");

const seedDatabase = async () => {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return;
  }

  await User.insertMany(seed.users);
  await CustomerProfile.insertMany(seed.customerProfiles);
  await PartnerProfile.insertMany(seed.partnerProfiles);
  await VehicleCategory.insertMany(seed.vehicleCategories);
  await Vehicle.insertMany(seed.vehicles);
  await Booking.insertMany(seed.bookings);
  await KycSession.insertMany(seed.kycSessions);
  await LocationUpdate.insertMany(seed.locationUpdates);
  await Notification.insertMany(seed.notifications);

  if (seed.auditLogs.length) {
    await AuditLog.insertMany(seed.auditLogs);
  }

  console.log("MongoDB seeded with VehiMeet starter data");
};

module.exports = { seedDatabase };
