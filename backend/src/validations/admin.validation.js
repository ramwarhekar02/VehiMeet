const { z } = require("zod");
const { PARTNER_STATUS } = require("../constants/statuses");

const assignPartnerSchema = z.object({
  partnerId: z.string().min(1),
});

const documentStatusSchema = z.object({
  label: z.string().trim().min(1),
  fileName: z.string().trim().optional().nullable(),
  url: z.string().trim().optional().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

const updatePartnerByAdminSchema = z
  .object({
    fullName: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(1).optional(),
    licenseNumber: z.string().trim().optional(),
    serviceAreas: z.array(z.string().trim().min(1)).optional(),
    status: z.enum(Object.values(PARTNER_STATUS)).optional(),
    approvedByAdmin: z.boolean().optional(),
    videoKycRequested: z.boolean().optional(),
    reviewMessage: z.string().trim().optional(),
    identityDocDetails: z.record(z.string(), documentStatusSchema).optional(),
    vehicleDocDetails: z.record(z.string(), documentStatusSchema).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

module.exports = { assignPartnerSchema, updatePartnerByAdminSchema };
