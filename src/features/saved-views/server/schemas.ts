import { z } from "zod";
import { searchRequestSchema } from "@/features/search/server/buildQuery";
import { searchableFields } from "@/features/search/types";

const conditionInputSchema = z
  .object({
    field: z.enum(searchableFields),
    operator: z.enum([
      "eq",
      "contains",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "in",
    ]),
    value: z.union([
      z.string().max(500),
      z.number().finite(),
      z.array(z.union([z.string().max(500), z.number().finite()])).max(100),
    ]),
  })
  .strict();

const sortInputSchema = z
  .object({
    field: z.enum(searchableFields),
    direction: z.enum(["asc", "desc"]),
  })
  .strict();

export const savedViewConfigurationSchema = z
  .object({
    search: z.string().max(256).optional(),
    conditions: z.array(conditionInputSchema).max(25).optional(),
    sort: z.array(sortInputSchema).max(5).optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    visibleColumns: z.array(z.string().min(1).max(128)).max(100).optional(),
  })
  .strict()
  .superRefine((configuration, context) => {
    const parsedRequest = searchRequestSchema.safeParse({
      search: configuration.search,
      conditions: configuration.conditions,
      sort: configuration.sort,
      page: configuration.page,
      pageSize: configuration.pageSize,
    });

    if (!parsedRequest.success) {
      context.addIssue({
        code: "custom",
        message: "Search configuration is invalid.",
        path: ["conditions"],
      });
    }

    if (
      configuration.visibleColumns &&
      new Set(configuration.visibleColumns).size !==
        configuration.visibleColumns.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Visible columns cannot contain duplicates.",
        path: ["visibleColumns"],
      });
    }
  });

const descriptionSchema = z.string().trim().max(1000);

export const createSavedViewSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: descriptionSchema.optional(),
    configuration: savedViewConfigurationSchema,
    isShared: z.boolean().optional().default(false),
  })
  .strict();

export const updateSavedViewSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: descriptionSchema.nullable().optional(),
    configuration: savedViewConfigurationSchema.optional(),
    isShared: z.boolean().optional(),
  })
  .strict()
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "At least one field must be provided.",
  });

export const searchHistoryLimitSchema = z.coerce.number().int().min(1).max(50);
