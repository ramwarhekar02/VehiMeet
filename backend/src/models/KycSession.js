const { mongoose, baseSchemaOptions } = require("./base.schema");
const { KYC_STATUS } = require("../constants/statuses");

const kycSessionSchema = new mongoose.Schema(
  {
    _id: String,
    bookingId: {
      type: String,
      ref: "Booking",
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(KYC_STATUS),
      required: true,
      index: true,
    },
    zegoRoomId: {
      type: String,
      required: true,
    },
    zegoSessionId: {
      type: String,
      required: true,
    },
    scheduledAt: {
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
    reviewedBy: {
      type: String,
      ref: "User",
      default: null,
    },
    reviewNotes: {
      type: String,
      default: "",
    },
    result: {
      type: String,
      enum: ["VERIFIED", "REJECTED", null],
      default: null,
    },
    evidenceFiles: {
      type: [String],
      default: [],
    },
  },
  { ...baseSchemaOptions, collection: "kyc_sessions" }
);

module.exports = mongoose.model("KycSession", kycSessionSchema);
