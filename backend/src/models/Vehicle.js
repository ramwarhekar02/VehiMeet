const { mongoose, baseSchemaOptions } = require("./base.schema");

const vehicleSchema = new mongoose.Schema(
  {
    _id: String,
    partnerId: {
      type: String,
      ref: "User",
      default: null,
      index: true,
    },
    categoryId: {
      type: String,
      ref: "VehicleCategory",
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    plateNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
    },
    fuelType: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    documents: {
      type: [String],
      default: [],
    },
    documentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    approvalStatus: {
      type: String,
      default: "PENDING_APPROVAL",
      index: true,
    },
    pricingSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { ...baseSchemaOptions, collection: "vehicles" }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
