import { createHash } from "node:crypto";
import { and, asc, desc, ilike, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { datasetRecords } from "@/lib/db/schema";
import { searchOperators, searchableFields, sortableFields } from "../types";
import type { SearchCondition, SearchField, SearchRequest } from "../types";

export { searchOperators, searchableFields, sortableFields } from "../types";
export type {
  SearchCondition,
  SearchField,
  SearchOperator,
  SearchRequest,
  SearchSort,
  SearchValue,
  SortDirection,
} from "../types";

const scalarValueSchema = z.union([z.string().max(500), z.number().finite()]);

const conditionSchema = z
  .object({
    field: z.enum(searchableFields),
    operator: z.enum(searchOperators),
    value: z.union([
      scalarValueSchema,
      z.array(scalarValueSchema).min(1).max(100),
    ]),
  })
  .strict()
  .superRefine((condition, context) => {
    const isTextField = [
      "status",
      "country",
      "category",
      "name",
      "email",
    ].includes(condition.field);
    const isNumberField = condition.field === "revenue";
    const isDateField = condition.field === "created_at";
    const values = Array.isArray(condition.value)
      ? condition.value
      : [condition.value];

    if (condition.operator === "contains" && !isTextField) {
      context.addIssue({
        code: "custom",
        path: ["operator"],
        message: "contains is only supported for text fields.",
      });
    }

    if (
      ["gt", "gte", "lt", "lte", "between"].includes(condition.operator) &&
      !isNumberField &&
      !isDateField
    ) {
      context.addIssue({
        code: "custom",
        path: ["operator"],
        message: "Range operators require a numeric or date field.",
      });
    }

    if (condition.operator === "between" && values.length !== 2) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "between requires exactly two values.",
      });
    } else if (
      condition.operator === "in" &&
      (!Array.isArray(condition.value) || values.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "in requires a non-empty array of values.",
      });
    } else if (
      !["between", "in"].includes(condition.operator) &&
      Array.isArray(condition.value)
    ) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "This operator requires a single value.",
      });
    }

    for (const value of values) {
      if (isNumberField && typeof value !== "number") {
        context.addIssue({
          code: "custom",
          path: ["value"],
          message: "revenue values must be numbers.",
        });
      } else if (!isNumberField && typeof value !== "string") {
        context.addIssue({
          code: "custom",
          path: ["value"],
          message: `${condition.field} values must be strings.`,
        });
      } else if (
        isDateField &&
        typeof value === "string" &&
        !isValidDateValue(value)
      ) {
        context.addIssue({
          code: "custom",
          path: ["value"],
          message: "created_at values must be ISO dates or datetimes.",
        });
      }
    }
  });

const sortSchema = z
  .object({
    field: z.enum(sortableFields),
    direction: z.enum(["asc", "desc"]),
  })
  .strict();

function jsonArrayInput<T extends z.ZodType>(schema: T) {
  return z.preprocess((value, context) => {
    if (typeof value !== "string") {
      return value;
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({
        code: "custom",
        message: "Must be valid JSON.",
      });
      return z.NEVER;
    }
  }, schema);
}

export const searchRequestSchema = z
  .object({
    search: z.string().trim().max(256).optional().default(""),
    conditions: jsonArrayInput(z.array(conditionSchema).max(25))
      .optional()
      .default([]),
    sort: jsonArrayInput(z.array(sortSchema).max(5)).optional().default([]),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  })
  .strict()
  .superRefine((config, context) => {
    if (!Number.isSafeInteger((config.page - 1) * config.pageSize)) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "The requested page offset is too large.",
      });
    }

    const seenSortFields = new Set<SearchField>();
    config.sort.forEach((sort, index) => {
      if (seenSortFields.has(sort.field)) {
        context.addIssue({
          code: "custom",
          path: ["sort", index, "field"],
          message: "A field can only be sorted once.",
        });
      }

      seenSortFields.add(sort.field);
    });
  });

const fieldColumns = {
  status: datasetRecords.status,
  country: datasetRecords.country,
  category: datasetRecords.category,
  revenue: datasetRecords.revenue,
  created_at: datasetRecords.createdAt,
  name: datasetRecords.name,
  email: datasetRecords.email,
} satisfies Record<
  SearchField,
  (typeof datasetRecords)[keyof typeof datasetRecords]
>;

function isValidDateValue(value: string): boolean {
  return (
    z.iso.date().safeParse(value).success ||
    z.iso.datetime({ offset: true }).safeParse(value).success
  );
}

function getScalarValue(value: SearchCondition["value"]): string | number {
  if (Array.isArray(value)) {
    throw new TypeError("This search operator requires a scalar value.");
  }

  return value;
}

function buildCondition(condition: SearchCondition): SQL {
  const column = fieldColumns[condition.field];

  switch (condition.operator) {
    case "eq":
      return sql`${column} = ${getScalarValue(condition.value)}`;
    case "contains": {
      const value = getScalarValue(condition.value);
      if (typeof value !== "string") {
        throw new TypeError("contains requires a string value.");
      }

      const escapedValue = value.replace(/[\\%_]/g, "\\$&");
      return ilike(column, `%${escapedValue}%`);
    }
    case "gt":
      return sql`${column} > ${getScalarValue(condition.value)}`;
    case "gte":
      return sql`${column} >= ${getScalarValue(condition.value)}`;
    case "lt":
      return sql`${column} < ${getScalarValue(condition.value)}`;
    case "lte":
      return sql`${column} <= ${getScalarValue(condition.value)}`;
    case "between": {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        throw new TypeError("between requires exactly two values.");
      }

      return sql`${column} >= ${condition.value[0]} AND ${column} <= ${condition.value[1]}`;
    }
    case "in": {
      if (!Array.isArray(condition.value) || condition.value.length === 0) {
        throw new TypeError("in requires a non-empty array of values.");
      }

      return sql`${column} IN (${sql.join(
        condition.value.map((value) => sql`${value}`),
        sql`, `,
      )})`;
    }
  }
}

export function buildQuery(datasetId: string, config: SearchRequest): SQL {
  const conditions: SQL[] = [sql`${datasetRecords.datasetId} = ${datasetId}`];

  if (config.search) {
    conditions.push(
      sql`${datasetRecords.searchVector} @@ plainto_tsquery('english', ${config.search})`,
    );
  }

  conditions.push(...config.conditions.map(buildCondition));
  const where = and(...conditions);

  if (!where) {
    throw new Error("A dataset filter is required to build a records query.");
  }

  return where;
}

export function buildOrderBy(config: SearchRequest): SQL[] {
  if (config.sort.length === 0) {
    return [asc(datasetRecords.id)];
  }

  return config.sort
    .map(({ field, direction }) =>
      direction === "asc"
        ? asc(fieldColumns[field])
        : desc(fieldColumns[field]),
    )
    .concat(asc(datasetRecords.id));
}

export function createFilterHash(
  datasetId: string,
  config: SearchRequest,
): string {
  const canonicalConditions = [...config.conditions].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
  const normalized = JSON.stringify({
    datasetId,
    search: config.search,
    conditions: canonicalConditions,
  });

  return createHash("sha256").update(normalized).digest("hex");
}
