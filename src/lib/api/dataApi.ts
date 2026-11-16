import { baseApi } from "./baseApi";
import type {
  AnalyticsOverview,
  AdminDataset,
  AdminUser,
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
  UserPreferences,
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

type AdminDatasetListResponse = {
  datasets: AdminDataset[];
};

type AdminDatasetResponse = {
  dataset: AdminDataset;
  permissions?: AdminDataset["permissions"];
};

type AdminUserListResponse = {
  users: AdminUser[];
};

type AdminUserResponse = {
  user: AdminUser;
};

type UserPreferencesResponse = {
  preferences: UserPreferences;
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
  changes: Omit<Partial<SavedViewInput>, "description"> & {
    description?: string | null;
  };
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

    getAdminDatasets: build.query<AdminDatasetListResponse, void>({
      query: () => "/admin/datasets",
      providesTags: (result) => [
        { type: "Dataset", id: "ADMIN-LIST" },
        ...(result?.datasets.map(({ id }) => ({
          type: "Dataset" as const,
          id,
        })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    createAdminDataset: build.mutation<
      AdminDatasetResponse,
      Pick<AdminDataset, "name"> &
        Partial<
          Pick<AdminDataset, "description" | "category" | "dataSource">
        > & {
          permissions: AdminDataset["permissions"];
        }
    >({
      query: (body) => ({
        url: "/admin/datasets",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Dataset", id: "LIST" },
        { type: "Dataset", id: "ADMIN-LIST" },
      ],
    }),

    updateAdminDataset: build.mutation<
      AdminDatasetResponse,
      {
        datasetId: string;
        changes: Partial<
          Pick<AdminDataset, "name" | "description" | "category" | "dataSource">
        > & {
          permissions?: AdminDataset["permissions"];
        };
      }
    >({
      query: ({ datasetId, changes }) => ({
        url: `/admin/datasets/${encoded(datasetId)}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: (_result, _error, { datasetId }) => [
        { type: "Dataset", id: "LIST" },
        { type: "Dataset", id: "ADMIN-LIST" },
        { type: "Dataset", id: datasetId },
        { type: "Analytics", id: datasetId },
        { type: "SavedView", id: listTagId(datasetId) },
      ],
    }),

    deleteAdminDataset: build.mutation<void, { datasetId: string }>({
      query: ({ datasetId }) => ({
        url: `/admin/datasets/${encoded(datasetId)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { datasetId }) => [
        { type: "Dataset", id: "LIST" },
        { type: "Dataset", id: "ADMIN-LIST" },
        { type: "Dataset", id: datasetId },
        { type: "Record", id: listTagId(datasetId) },
        { type: "Analytics", id: datasetId },
        { type: "SavedView", id: listTagId(datasetId) },
      ],
    }),

    getAdminUsers: build.query<AdminUserListResponse, void>({
      query: () => "/admin/users",
      providesTags: (result) => [
        { type: "AdminUser", id: "LIST" },
        ...(result?.users.map(({ id }) => ({
          type: "AdminUser" as const,
          id,
        })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    updateAdminUserRole: build.mutation<
      AdminUserResponse,
      { userId: string; role: AdminUser["role"] }
    >({
      query: ({ userId, role }) => ({
        url: `/admin/users/${encoded(userId)}`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "AdminUser", id: "LIST" },
        { type: "AdminUser", id: userId },
        { type: "Dataset", id: "LIST" },
      ],
    }),

    getUserPreferences: build.query<UserPreferencesResponse, void>({
      query: () => "/user/preferences",
      providesTags: [{ type: "UserPreference", id: "CURRENT" }],
      keepUnusedDataFor: 300,
    }),

    updateUserPreferences: build.mutation<
      UserPreferencesResponse,
      UserPreferences
    >({
      query: (body) => ({
        url: "/user/preferences",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "UserPreference", id: "CURRENT" }],
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
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            baseApi.util.invalidateTags([
              { type: "History", id: "SEARCH-HISTORY" },
              { type: "Analytics", id: arg.datasetId },
            ]),
          );
        } catch (error) {
          console.error("Search history cache refresh failed.", error);
        }
      },
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
      invalidatesTags: (result, _error, { datasetId }) => [
        { type: "SavedView", id: listTagId(datasetId) },
        ...(result ? [{ type: "SavedView" as const, id: result.view.id }] : []),
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

    getSearchHistory: build.query<SearchHistoryResponse, { limit?: number }>({
      query: ({ limit }) => ({
        url: "/search-history",
        params: limit === undefined ? undefined : { limit },
      }),
      providesTags: () => [{ type: "History", id: "SEARCH-HISTORY" }],
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
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetDatasetsQuery,
  useGetAdminDatasetsQuery,
  useCreateAdminDatasetMutation,
  useUpdateAdminDatasetMutation,
  useDeleteAdminDatasetMutation,
  useGetAdminUsersQuery,
  useUpdateAdminUserRoleMutation,
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
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
