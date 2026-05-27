const { mongoose, baseSchemaOptions } = require("./base.schema");
const { ROLES } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    _id: String,
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: false,
    },
    googleSub: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
  },
  { ...baseSchemaOptions, collection: "users" }
);

module.exports = mongoose.model("User", userSchema);
