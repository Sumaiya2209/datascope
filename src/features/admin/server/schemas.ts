import { z } from "zod";

export const datasetPermissionsSchema = z
  .object({
    analyst: z.enum(["view", "edit"]).nullable(),
    viewer: z.literal("view").nullable(),
  })
  .strict()
  .optional();

export const datasetCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).nullable().optional(),
    category: z.string().trim().max(100).nullable().optional(),
    dataSource: z.string().trim().max(200).nullable().optional(),
    permissions: datasetPermissionsSchema,
  })
  .strict();

export const datasetUpdateSchema = datasetCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one dataset field must be provided.",
  });

export const userRoleSchema = z
  .object({
    role: z.enum(["admin", "analyst", "viewer"]),
  })
  .strict();

export const userPreferencesSchema = z
  .object({
    theme: z.enum(["light", "dark", "system"]).default("system"),
    defaultPageSize: z
      .union([z.literal(25), z.literal(50), z.literal(100)])
      .default(25),
    defaultColumns: z
      .array(
        z
          .string()
          .regex(/^[a-zA-Z0-9_]+$/)
          .max(128),
      )
      .max(100)
      .default([
        "status",
        "country",
        "category",
        "revenue",
        "created_at",
        "name",
        "email",
      ]),
  })
  .strict()
  .superRefine((preferences, context) => {
    if (
      new Set(preferences.defaultColumns).size !==
      preferences.defaultColumns.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Default columns cannot contain duplicates.",
        path: ["defaultColumns"],
      });
    }
  });
