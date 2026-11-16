import { z } from "zod";
import {
  searchOperators,
  searchableFields,
  sortableFields,
  type SearchCondition,
  type SearchSort,
  type SearchValue,
} from "./types";
import type { SearchDraft } from "./searchConfigSlice";

const scalarValueSchema = z.union([z.string().max(500), z.number().finite()]);
const conditionSchema = z
  .object({
    field: z.enum(searchableFields),
    operator: z.enum(searchOperators),
    value: z.union([scalarValueSchema, z.array(scalarValueSchema).max(100)]),
  })
  .strict();
const conditionsSchema = z.array(conditionSchema).max(25);
const sortsSchema = z
  .array(
    z
      .object({
        field: z.enum(sortableFields),
        direction: z.enum(["asc", "desc"]),
      })
      .strict(),
  )
  .max(5);

function parseJson<T>(
  value: string | null,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

function isValidDateValue(value: string): boolean {
  return (
    z.iso.date().safeParse(value).success ||
    z.iso.datetime({ offset: true }).safeParse(value).success
  );
}

export function isValidSearchCondition(condition: SearchCondition): boolean {
  const isNumericField = condition.field === "revenue";
  const isDateField = condition.field === "created_at";
  const isTextField = !isNumericField && !isDateField;
  const isRangeOperator = ["gt", "gte", "lt", "lte", "between"].includes(
    condition.operator,
  );
  const isListOperator = condition.operator === "in";
  const isBetweenOperator = condition.operator === "between";

  if (condition.operator === "contains" && !isTextField) {
    return false;
  }
  if (isRangeOperator && !isNumericField && !isDateField) {
    return false;
  }
  if (
    isBetweenOperator &&
    (!Array.isArray(condition.value) || condition.value.length !== 2)
  ) {
    return false;
  }
  if (
    isListOperator &&
    (!Array.isArray(condition.value) || condition.value.length === 0)
  ) {
    return false;
  }
  if (!isBetweenOperator && !isListOperator && Array.isArray(condition.value)) {
    return false;
  }

  const values: Array<string | number> = Array.isArray(condition.value)
    ? condition.value
    : [condition.value];
  return values.every((value) => {
    if (typeof value === "string" && value.trim().length === 0) {
      return false;
    }
    if (isNumericField) {
      return typeof value === "number" && Number.isFinite(value);
    }
    if (typeof value !== "string") {
      return false;
    }
    return !isDateField || isValidDateValue(value);
  });
}

export function areConditionsValid(
  conditions: readonly SearchCondition[],
): boolean {
  return conditions.length <= 25 && conditions.every(isValidSearchCondition);
}

export function hasSearchCriteria(config: SearchDraft): boolean {
  return config.search.trim().length > 0 || config.conditions.length > 0;
}

export function parseSearchDraft(
  searchParams: Pick<URLSearchParams, "get">,
): SearchDraft {
  const rawSearch = searchParams.get("search") ?? "";
  const search = rawSearch.trim().slice(0, 256);
  const conditions = parseJson(
    searchParams.get("conditions"),
    conditionsSchema,
    [],
  );
  const parsedSort = parseJson(searchParams.get("sort"), sortsSchema, []);
  const seenSortFields = new Set<string>();
  const sort: SearchSort[] = parsedSort.filter(({ field }) => {
    if (seenSortFields.has(field)) {
      return false;
    }
    seenSortFields.add(field);
    return true;
  });
  const pageSizeValue = Number(searchParams.get("pageSize"));
  const pageSize =
    Number.isSafeInteger(pageSizeValue) &&
    pageSizeValue >= 1 &&
    pageSizeValue <= 100
      ? pageSizeValue
      : 25;
  const pageValue = Number(searchParams.get("page"));
  const page =
    Number.isSafeInteger(pageValue) &&
    pageValue >= 1 &&
    Number.isSafeInteger((pageValue - 1) * pageSize)
      ? pageValue
      : 1;

  return { search, conditions, sort, page, pageSize };
}

export function serializeSearchDraft(config: SearchDraft): URLSearchParams {
  const searchParams = new URLSearchParams();
  const search = config.search.trim();

  if (search) {
    searchParams.set("search", search);
  }
  if (config.conditions.length > 0) {
    searchParams.set("conditions", JSON.stringify(config.conditions));
  }
  if (config.sort.length > 0) {
    searchParams.set("sort", JSON.stringify(config.sort));
  }
  if (config.page !== 1) {
    searchParams.set("page", String(config.page));
  }
  if (config.pageSize !== 25) {
    searchParams.set("pageSize", String(config.pageSize));
  }

  return searchParams;
}

export function formatConditionInputValue(value: SearchValue): string {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
