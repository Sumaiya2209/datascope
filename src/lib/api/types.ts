import type { SearchRequest } from "@/features/search/types";

export type DatasetSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  recordCount: number;
};

export type DatasetField = {
  id: string;
  datasetId: string;
  name: string;
  label: string;
  dataType: string;
  isSearchable: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  position: number;
};

export type DatasetDetail = DatasetSummary & {
  fields: DatasetField[];
};

export type DatasetRecord = {
  id: string;
  status: string;
  country: string;
  category: string;
  revenue: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
  extra: Record<string, unknown>;
};

export type RecordSearchResponse = {
  records: DatasetRecord[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type RecordHistoryEntry = {
  id: string;
  operation: string;
  changes: Record<string, unknown>;
  createdAt: string;
  changedBy: { id: string; name: string } | null;
};

export type RecordDetail = DatasetRecord;

export type RecordRelationship = {
  id: string;
  relationshipType: string;
  direction: "incoming" | "outgoing";
  record: DatasetRecord;
};

export type RecordRelationshipsResponse = {
  relationships: RecordRelationship[];
};

export type RecordHistoryResponse = {
  history: RecordHistoryEntry[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type SavedView = {
  id: string;
  datasetId: string;
  name: string;
  description: string | null;
  configuration: Partial<SearchRequest>;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedViewInput = {
  name: string;
  description?: string;
  configuration: Partial<SearchRequest>;
  isShared?: boolean;
};

export type SearchHistoryEntry = {
  id: string;
  query: Record<string, unknown>;
  resultCount: number;
  durationMs: number;
  executedAt: string;
};

export type AnalyticsOverview = {
  recordCount: number;
  revenueTotal: string;
  statusBreakdown: Array<{ status: string; count: number }>;
  countryBreakdown: Array<{ country: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
};

export type RecordSearchArgs = SearchRequest & {
  datasetId: string;
};
