require("./User");
require("./CustomerProfile");
require("./PartnerProfile");
require("./VehicleCategory");
require("./Vehicle");
require("./Booking");
require("./KycSession");
require("./LocationUpdate");
require("./Notification");
require("./AuditLog");

module.exports = {
  User: require("./User"),
  CustomerProfile: require("./CustomerProfile"),
  PartnerProfile: require("./PartnerProfile"),
  VehicleCategory: require("./VehicleCategory"),
  Vehicle: require("./Vehicle"),
  Booking: require("./Booking"),
  KycSession: require("./KycSession"),
  LocationUpdate: require("./LocationUpdate"),
  Notification: require("./Notification"),
  AuditLog: require("./AuditLog"),
};
