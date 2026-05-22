const { z } = require("zod");

const bookingSchema = z.object({
  vehicleId: z.string().min(1),
  pickup: z.object({
    address: z.string().min(5),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  drop: z.object({
    address: z.string().min(5),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  estimatedDistanceKm: z.number().positive(),
  estimatedDurationMin: z.number().positive(),
});

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().min(10).max(15),
  emergencyContact: z.string().min(10).max(15).optional(),
});

module.exports = { bookingSchema, profileUpdateSchema };
