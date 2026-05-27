const { z } = require("zod");

const registerSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password: z.string().min(8).max(64),
  role: z.enum(["customer", "partner"]).default("customer"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(64),
});

const adminBootstrapSchema = registerSchema.omit({ role: true }).extend({
  secret: z.string().min(1),
});

const googleLoginSchema = z.object({
  credential: z.string().min(10),
  role: z.enum(["customer", "partner"]).optional(),
});

module.exports = { registerSchema, loginSchema, adminBootstrapSchema, googleLoginSchema };
