import { z } from "zod";

const emailSchema = z.email().trim().toLowerCase();
const passwordSchema = z
  .string()
  .min(1, "Password is required.")
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "Password must be no more than 72 UTF-8 bytes.",
  });

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: emailSchema,
    password: passwordSchema.min(
      12,
      "Password must be at least 12 characters.",
    ),
  })
  .strict();
