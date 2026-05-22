const { mongoose, baseSchemaOptions, addressPointSchema } = require("./base.schema");
const { BOOKING_STATUS, KYC_STATUS } = require("../constants/statuses");

const vehicleSnapshotSchema = new mongoose.Schema(
  {
    brand: String,
    model: String,
    plateNumber: String,
    categoryName: String,
  },
  { _id: false }
);

const routeInfoSchema = new mongoose.Schema(
  {
    estimatedDistanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDurationMin: {
      type: Number,
      required: true,
      min: 0,
    },
    polyline: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    surgeMultiplier: Number,
    totalEstimatedFare: Number,
    finalFare: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    _id: String,
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    partnerId: {
      type: String,
      ref: "User",
      default: null,
      index: true,
    },
    vehicleId: {
      type: String,
      ref: "Vehicle",
      required: true,
    },
    vehicleSnapshot: {
      type: vehicleSnapshotSchema,
      required: true,
    },
    pickup: {
      type: addressPointSchema,
      required: true,
    },
    drop: {
      type: addressPointSchema,
      required: true,
    },
    routeInfo: {
      type: routeInfoSchema,
      required: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      required: true,
      index: true,
    },
    kycStatus: {
      type: String,
      enum: Object.values(KYC_STATUS),
      required: true,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
  },
  { ...baseSchemaOptions, collection: "bookings" }
);

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ partnerId: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
