const { mongoose, baseSchemaOptions, pointSchema } = require("./base.schema");
const { PARTNER_STATUS } = require("../constants/statuses");

const partnerProfileSchema = new mongoose.Schema(
  {
    _id: String,
    userId: {
      type: String,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PARTNER_STATUS),
      default: PARTNER_STATUS.PENDING_APPROVAL,
      index: true,
    },
    vehicleId: {
      type: String,
      ref: "Vehicle",
      default: null,
    },
    licenseNumber: {
      type: String,
      default: "",
      trim: true,
    },
    identityDocs: {
      type: [String],
      default: [],
    },
    identityDocDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    currentLocation: {
      type: pointSchema,
      default: () => ({
        type: "Point",
        coordinates: [77.5946, 12.9716],
      }),
    },
    serviceAreas: {
      type: [String],
      default: [],
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    approvedByAdmin: {
      type: Boolean,
      default: false,
    },
    videoKycRequested: {
      type: Boolean,
      default: false,
    },
    reviewMessage: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { ...baseSchemaOptions, collection: "partner_profiles" }
);

partnerProfileSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("PartnerProfile", partnerProfileSchema);
