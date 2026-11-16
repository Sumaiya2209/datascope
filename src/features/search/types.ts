export const searchableFields = [
  "status",
  "country",
  "category",
  "revenue",
  "created_at",
  "name",
  "email",
] as const;

export const sortableFields = searchableFields;

export const searchOperators = [
  "eq",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "in",
] as const;

export type SearchField = (typeof searchableFields)[number];
export type SearchOperator = (typeof searchOperators)[number];
export type SortDirection = "asc" | "desc";
export type SearchValue = string | number | Array<string | number>;

export type SearchCondition = {
  field: SearchField;
  operator: SearchOperator;
  value: SearchValue;
};

export type SearchSort = {
  field: SearchField;
  direction: SortDirection;
};

export type SearchRequest = {
  search: string;
  conditions: SearchCondition[];
  sort: SearchSort[];
  page: number;
  pageSize: number;
};
