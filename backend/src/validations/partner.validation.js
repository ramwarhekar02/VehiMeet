const { z } = require("zod");

const partnerStatusSchema = z.object({
  status: z.enum(["OFFLINE", "ONLINE", "BUSY", "SUSPENDED", "PENDING_APPROVAL"]),
});

const partnerDocumentSchema = z.object({
  label: z.string().trim().min(1),
  fileName: z.string().trim().nullable().optional(),
  url: z.string().trim().nullable().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

const partnerProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).optional(),
  avatarUrl: z.string().trim().optional(),
  serviceAreas: z.array(z.string().trim().min(1)).optional(),
  licenseNumber: z.string().trim().optional(),
  identityDocDetails: z.record(z.string(), partnerDocumentSchema).optional(),
});

const vehicleDocumentSchema = z.object({
  label: z.string().trim().min(1),
  fileName: z.string().trim().nullable().optional(),
  url: z.string().trim().nullable().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

const partnerVehicleUpsertSchema = z.object({
  categoryId: z.string().min(1),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  plateNumber: z.string().trim().min(4).max(20),
  seats: z.number().int().min(1).max(12),
  fuelType: z.string().trim().min(2).max(40),
  color: z.string().trim().min(2).max(40),
  images: z.array(z.string().trim().min(1)).default([]),
  documents: z.array(z.string().trim().min(1)).default([]),
  documentDetails: z.record(z.string(), vehicleDocumentSchema).default({}),
});

const partnerLocationSchema = z.object({
  bookingId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).max(180),
  heading: z.number().min(0).max(360),
  accuracy: z.number().min(0).max(100),
  timestamp: z.string().datetime(),
});

module.exports = {
  partnerStatusSchema,
  partnerProfileUpdateSchema,
  partnerVehicleUpsertSchema,
  partnerLocationSchema,
};
