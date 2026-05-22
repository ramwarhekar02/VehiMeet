const { z } = require("zod");

const createKycSchema = z.object({
  bookingId: z.string().min(1),
  customerId: z.string().min(1),
});

const completeKycSchema = z.object({
  evidenceFiles: z.array(z.string()).default([]),
});

const reviewKycSchema = z.object({
  result: z.enum(["VERIFIED", "REJECTED"]),
  reviewNotes: z.string().max(500).optional(),
});

module.exports = { createKycSchema, completeKycSchema, reviewKycSchema };
