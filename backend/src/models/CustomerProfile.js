const { mongoose, baseSchemaOptions } = require("./base.schema");
const { KYC_STATUS } = require("../constants/statuses");

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const customerProfileSchema = new mongoose.Schema(
  {
    _id: String,
    userId: {
      type: String,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    defaultPickupAddresses: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    kycStatus: {
      type: String,
      enum: Object.values(KYC_STATUS),
      default: KYC_STATUS.NOT_STARTED,
      index: true,
    },
    lastKycId: {
      type: String,
      ref: "KycSession",
      default: null,
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { ...baseSchemaOptions, collection: "customer_profiles" }
);

module.exports = mongoose.model("CustomerProfile", customerProfileSchema);
