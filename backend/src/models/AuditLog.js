const { mongoose, baseSchemaOptions } = require("./base.schema");

const auditLogSchema = new mongoose.Schema(
  {
    _id: String,
    actorId: {
      type: String,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { ...baseSchemaOptions, collection: "audit_logs", timestamps: false }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
