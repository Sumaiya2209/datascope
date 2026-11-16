import { baseApi } from "./baseApi";
import type {
  AnalyticsOverview,
  DatasetDetail,
  DatasetRecord,
  DatasetSummary,
  RecordDetail,
  RecordHistoryResponse,
  RecordRelationshipsResponse,
  RecordSearchArgs,
  RecordSearchResponse,
  SavedView,
  SavedViewInput,
  SearchHistoryEntry,
} from "./types";

type DatasetListResponse = {
  datasets: DatasetSummary[];
};

type DatasetResponse = {
  dataset: DatasetDetail;
};

type RecordResponse = {
  record: RecordDetail;
};

type SavedViewsResponse = {
  views: SavedView[];
};

type SavedViewResponse = {
  view: SavedView;
};

type SearchHistoryResponse = {
  history: SearchHistoryEntry[];
};

type DatasetQueryArg = {
  datasetId: string;
};

type RecordQueryArg = DatasetQueryArg & {
  recordId: string;
};

type SavedViewQueryArg = DatasetQueryArg & {
  viewId: string;
};

type UpdateSavedViewArg = SavedViewQueryArg & {
  changes: Partial<SavedViewInput>;
};

type UpdateRecordArg = RecordQueryArg & {
  changes: Partial<Omit<DatasetRecord, "id">>;
};

export type AnalyticsQueryArg = DatasetQueryArg;

const listTagId = (datasetId: string) => `LIST-${datasetId}`;
const encoded = (value: string) => encodeURIComponent(value);

const injectedApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDatasets: build.query<DatasetListResponse, void>({
      query: () => "/datasets",
      providesTags: (result) => [
        { type: "Dataset", id: "LIST" },
        ...(result?.datasets.map(({ id }) => ({
          type: "Dataset" as const,
          id,
        })) ?? []),
      ],
      keepUnusedDataFor: 300,
    }),

    getDataset: build.query<DatasetResponse, DatasetQueryArg>({
      query: ({ datasetId }) => `/datasets/${encoded(datasetId)}`,
      providesTags: (_result, _error, { datasetId }) => [
        { type: "Dataset", id: datasetId },
      ],
      keepUnusedDataFor: 300,
    }),

    searchRecords: build.query<RecordSearchResponse, RecordSearchArgs>({
      query: ({ datasetId, ...search }) => ({
        url: `/datasets/${encoded(datasetId)}/records`,
        method: "POST",
        body: search,
      }),
      providesTags: (result, _error, { datasetId }) => [
        { type: "Record", id: listTagId(datasetId) },
        ...(result?.records.map(({ id }) => ({
          type: "Record" as const,
          id,
        })) ?? []),
      ],
      keepUnusedDataFor: 30,
    }),

    getRecord: build.query<RecordResponse, RecordQueryArg>({
      query: ({ datasetId, recordId }) =>
        `/datasets/${encoded(datasetId)}/records/${encoded(recordId)}`,
      providesTags: (_result, _error, { recordId }) => [
        { type: "Record", id: recordId },
      ],
      keepUnusedDataFor: 60,
    }),

    getRecordRelationships: build.query<
      RecordRelationshipsResponse,
      RecordQueryArg
    >({
      query: ({ datasetId, recordId }) =>
        `/datasets/${encoded(datasetId)}/records/${encoded(recordId)}/relationships`,
      providesTags: (_result, _error, { recordId }) => [
        { type: "Record", id: recordId },
      ],
      keepUnusedDataFor: 60,
    }),

    updateRecord: build.mutation<RecordResponse, UpdateRecordArg>({
      query: ({ datasetId, recordId, changes }) => ({
        url: `/datasets/${encoded(datasetId)}/records/${encoded(recordId)}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: (_result, _error, { datasetId, recordId }) => [
        { type: "Record", id: recordId },
        { type: "Record", id: listTagId(datasetId) },
        { type: "History", id: recordId },
        { type: "Dataset", id: datasetId },
        { type: "Analytics", id: datasetId },
      ],
    }),

    deleteRecord: build.mutation<void, RecordQueryArg>({
      query: ({ datasetId, recordId }) => ({
        url: `/datasets/${encoded(datasetId)}/records/${encoded(recordId)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { datasetId, recordId }) => [
        { type: "Record", id: recordId },
        { type: "Record", id: listTagId(datasetId) },
        { type: "History", id: recordId },
        { type: "Dataset", id: datasetId },
        { type: "Analytics", id: datasetId },
      ],
    }),

    getSavedViews: build.query<SavedViewsResponse, DatasetQueryArg>({
      query: ({ datasetId }) => `/datasets/${encoded(datasetId)}/saved-views`,
      providesTags: (result, _error, { datasetId }) => [
        { type: "SavedView", id: listTagId(datasetId) },
        ...(result?.views.map(({ id }) => ({
          type: "SavedView" as const,
          id,
        })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    createSavedView: build.mutation<
      SavedViewResponse,
      DatasetQueryArg & SavedViewInput
    >({
      query: ({ datasetId, ...body }) => ({
        url: `/datasets/${encoded(datasetId)}/saved-views`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { datasetId }) => [
        { type: "SavedView", id: listTagId(datasetId) },
      ],
    }),

    updateSavedView: build.mutation<SavedViewResponse, UpdateSavedViewArg>({
      query: ({ datasetId, viewId, changes }) => ({
        url: `/datasets/${encoded(datasetId)}/saved-views/${encoded(viewId)}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: (_result, _error, { datasetId, viewId }) => [
        { type: "SavedView", id: listTagId(datasetId) },
        { type: "SavedView", id: viewId },
      ],
    }),

    deleteSavedView: build.mutation<void, SavedViewQueryArg>({
      query: ({ datasetId, viewId }) => ({
        url: `/datasets/${encoded(datasetId)}/saved-views/${encoded(viewId)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { datasetId, viewId }) => [
        { type: "SavedView", id: listTagId(datasetId) },
        { type: "SavedView", id: viewId },
      ],
    }),

    getSearchHistory: build.query<
      SearchHistoryResponse,
      DatasetQueryArg & { limit?: number }
    >({
      query: ({ datasetId, limit }) => ({
        url: `/datasets/${encoded(datasetId)}/history`,
        params: limit === undefined ? undefined : { limit },
      }),
      providesTags: (_result, _error, { datasetId }) => [
        { type: "History", id: datasetId },
      ],
      keepUnusedDataFor: 60,
    }),

    getRecordHistory: build.query<
      RecordHistoryResponse,
      RecordQueryArg & { page?: number }
    >({
      query: ({ datasetId, recordId, page = 1 }) => ({
        url: `/datasets/${encoded(datasetId)}/records/${encoded(recordId)}/history`,
        params: { page },
      }),
      providesTags: (_result, _error, { recordId }) => [
        { type: "History", id: recordId },
      ],
      keepUnusedDataFor: 60,
    }),

    getAnalytics: build.query<AnalyticsOverview, AnalyticsQueryArg>({
      query: ({ datasetId }) => `/datasets/${encoded(datasetId)}/analytics`,
      providesTags: (_result, _error, { datasetId }) => [
        { type: "Analytics", id: datasetId },
      ],
      keepUnusedDataFor: 30,
    }),
  }),
});

export const {
  useGetDatasetsQuery,
  useGetDatasetQuery,
  useSearchRecordsQuery,
  useGetRecordQuery,
  useGetRecordRelationshipsQuery,
  useLazyGetRecordHistoryQuery,
  useUpdateRecordMutation,
  useDeleteRecordMutation,
  useGetSavedViewsQuery,
  useCreateSavedViewMutation,
  useUpdateSavedViewMutation,
  useDeleteSavedViewMutation,
  useGetSearchHistoryQuery,
  useGetRecordHistoryQuery,
  useGetAnalyticsQuery: useGetAnalyticsQueryWithoutPolling,
} = injectedApi;

const ANALYTICS_POLLING_INTERVAL_MS = 60_000;

export function useGetAnalyticsQuery(
  arg: AnalyticsQueryArg,
  options?: Parameters<typeof useGetAnalyticsQueryWithoutPolling>[1],
) {
  return useGetAnalyticsQueryWithoutPolling(arg, {
    pollingInterval: ANALYTICS_POLLING_INTERVAL_MS,
    skipPollingIfUnfocused: true,
    ...options,
  });
}

export { injectedApi as dataApi };
