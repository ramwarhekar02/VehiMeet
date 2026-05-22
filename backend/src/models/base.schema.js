const mongoose = require("mongoose");

const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => ret,
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret) => ret,
  },
};

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "Point coordinates must contain [lng, lat]",
      },
    },
  },
  { _id: false }
);

const addressPointSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      trim: true,
    },
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
  },
  { _id: false }
);

module.exports = {
  mongoose,
  baseSchemaOptions,
  pointSchema,
  addressPointSchema,
};
