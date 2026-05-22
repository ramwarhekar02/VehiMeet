const { mongoose, baseSchemaOptions } = require("./base.schema");

const notificationSchema = new mongoose.Schema(
  {
    _id: String,
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { ...baseSchemaOptions, collection: "notifications", timestamps: false }
);

module.exports = mongoose.model("Notification", notificationSchema);
