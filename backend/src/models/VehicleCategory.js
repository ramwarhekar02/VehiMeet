const { mongoose, baseSchemaOptions } = require("./base.schema");

const vehicleCategorySchema = new mongoose.Schema(
  {
    _id: String,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    baseFare: {
      type: Number,
      required: true,
      min: 0,
    },
    perKmRate: {
      type: Number,
      required: true,
      min: 0,
    },
    perMinuteRate: {
      type: Number,
      required: true,
      min: 0,
    },
    cancellationFee: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { ...baseSchemaOptions, collection: "vehicle_categories" }
);

module.exports = mongoose.model("VehicleCategory", vehicleCategorySchema);
