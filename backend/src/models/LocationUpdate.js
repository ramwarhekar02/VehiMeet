const { mongoose, baseSchemaOptions, pointSchema } = require("./base.schema");

const locationUpdateSchema = new mongoose.Schema(
  {
    _id: String,
    bookingId: {
      type: String,
      ref: "Booking",
      required: true,
      index: true,
    },
    partnerId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    location: {
      type: pointSchema,
      required: true,
    },
    speed: {
      type: Number,
      default: 0,
    },
    heading: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    snappedLocation: {
      type: pointSchema,
      default: null,
    },
    etaSeconds: {
      type: Number,
      default: null,
    },
    distanceRemainingKm: {
      type: Number,
      default: null,
    },
    routeProvider: {
      type: String,
      default: "HAVERSINE",
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { ...baseSchemaOptions, collection: "location_updates" }
);

locationUpdateSchema.index({ bookingId: 1, timestamp: 1 });
locationUpdateSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("LocationUpdate", locationUpdateSchema);
