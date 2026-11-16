"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import {
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { datasetSelected } from "@/features/datasets/datasetSlice";
import {
  appliedSearchCleared,
  draftUpdated,
  searchConfigRestored,
  searchDraftApplied,
} from "@/features/search/searchConfigSlice";
import {
  areConditionsValid,
  hasSearchCriteria,
  parseSearchDraft,
  serializeSearchDraft,
} from "@/features/search/urlSearchConfig";
import {
  searchableFields,
  sortableFields,
  type SearchSort,
} from "@/features/search/types";
import { datasetVisibleColumnsSet } from "@/features/settings/uiPreferencesSlice";
import { SavedViewsPanel } from "@/features/saved-views/components/saved-views-panel";
import {
  RecordDetailDrawer,
  ViewRecordButton,
} from "@/features/record-details/components/record-detail-drawer";
import { RecordDetailErrorBoundary } from "@/features/record-details/components/record-detail-error-boundary";
import {
  useGetDatasetQuery,
  useGetDatasetsQuery,
  useSearchRecordsQuery,
} from "@/lib/api/dataApi";
import type {
  DatasetField,
  DatasetRecord,
  DatasetSummary,
  SavedViewConfiguration,
} from "@/lib/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";
import { FilterBuilder } from "./filter-builder";

const EMPTY_RECORDS: DatasetRecord[] = [];
const tableFeaturesConfig = tableFeatures({
  columnSizingFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowSortingFeature,
  rowPaginationFeature,
});
const columnHelper = createColumnHelper<
  typeof tableFeaturesConfig,
  DatasetRecord
>();

function getRecordValue(record: DatasetRecord, fieldName: string): unknown {
  switch (fieldName) {
    case "status":
      return record.status;
    case "country":
      return record.country;
    case "category":
      return record.category;
    case "revenue":
      return record.revenue;
    case "created_at":
      return record.createdAt;
    case "name":
      return record.name;
    case "email":
      return record.email;
    default:
      return record.extra[fieldName];
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value) ?? String(value);
  }
  return String(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const HighlightedText = memo(function HighlightedText({
  text,
  searchTerm,
}: {
  text: string;
  searchTerm: string;
}) {
  const parts = useMemo(() => {
    const terms = searchTerm.trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return null;
    }

    const matcher = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "ig");
    const highlightedTerms = new Set(terms.map((term) => term.toLowerCase()));
    return {
      highlightedTerms,
      values: text.split(matcher),
    };
  }, [searchTerm, text]);

  if (!parts) {
    return text;
  }

  return parts.values.map((part, index) =>
    parts.highlightedTerms.has(part.toLowerCase()) ? (
      <mark
        className="rounded-sm bg-amber-200 px-0.5 text-slate-950"
        key={`${index}-${part}`}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
});

const MemoizedCell = memo(function MemoizedCell({
  value,
  searchTerm,
}: {
  value: string;
  searchTerm: string;
}) {
  return (
    <span className="block min-w-0 truncate" title={value}>
      <HighlightedText text={value} searchTerm={searchTerm} />
    </span>
  );
});

function isSortableField(
  fieldName: string,
): fieldName is (typeof sortableFields)[number] {
  return sortableFields.some((field) => field === fieldName);
}

function isSearchableField(
  fieldName: string,
): fieldName is (typeof searchableFields)[number] {
  return searchableFields.some((field) => field === fieldName);
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "error" in error.data &&
    typeof error.data.error === "string"
  ) {
    return error.data.error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong while loading this data.";
}

function createColumns(
  fields: DatasetField[],
  searchTerm: string,
  onOpenRecord: (recordId: string) => void,
) {
  return columnHelper.columns([
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <input
          aria-label="Select all rows on this page"
          checked={table.getIsAllPageRowsSelected()}
          className="size-4 accent-slate-900"
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          type="checkbox"
        />
      ),
      cell: ({ row }) => (
        <input
          aria-label={`Select row ${row.id}`}
          checked={row.getIsSelected()}
          className="size-4 accent-slate-900"
          onChange={row.getToggleSelectedHandler()}
          type="checkbox"
        />
      ),
      enableHiding: false,
      enableResizing: false,
      enableSorting: false,
      size: 48,
      minSize: 48,
      maxSize: 48,
    }),
    columnHelper.display({
      id: "details",
      header: "Details",
      cell: ({ row }) => (
        <ViewRecordButton
          onOpen={onOpenRecord}
          recordId={row.original.id}
          recordName={row.original.name}
        />
      ),
      enableHiding: false,
      enableResizing: false,
      enableSorting: false,
      size: 64,
      minSize: 64,
      maxSize: 64,
    }),
    ...fields.map((field) =>
      columnHelper.accessor((record) => getRecordValue(record, field.name), {
        id: field.name,
        header: field.label,
        cell: ({ getValue }) => (
          <MemoizedCell
            value={formatValue(getValue())}
            searchTerm={searchTerm}
          />
        ),
        enableSorting: field.isSortable && isSortableField(field.name),
        enableHiding: true,
        size: field.name === "email" ? 240 : 180,
        minSize: 100,
        maxSize: 480,
      }),
    ),
  ]);
}

function TableSkeleton({ columnCount = 6 }: { columnCount?: number }) {
  return (
    <div
      aria-label="Loading records"
      aria-busy="true"
      className="space-y-3 p-4"
    >
      {Array.from({ length: 8 }, (_, rowIndex) => (
        <div className="flex gap-4" key={rowIndex}>
          {Array.from({ length: columnCount }, (_, columnIndex) => (
            <div
              className="h-5 flex-1 animate-pulse rounded bg-slate-200"
              key={columnIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DataExplorer() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const {
    data: datasetList,
    isError: datasetsError,
    error: datasetsErrorValue,
    isLoading: datasetsLoading,
  } = useGetDatasetsQuery();
  const selectedDatasetId = useAppSelector(
    (state) => state.dataset.selectedDatasetId,
  );
  const role = useAppSelector((state) => state.auth.role);
  const draft = useAppSelector((state) => state.searchConfig.draft);
  const applied = useAppSelector((state) => state.searchConfig.applied);
  const density = useAppSelector((state) => state.uiPreferences.density);
  const defaultPageSize = useAppSelector(
    (state) => state.uiPreferences.defaultPageSize,
  );
  const defaultColumns = useAppSelector(
    (state) => state.uiPreferences.defaultColumns,
  );
  const savedVisibleColumns = useAppSelector((state) =>
    selectedDatasetId
      ? state.uiPreferences.visibleColumnsByDataset[selectedDatasetId]
      : undefined,
  );
  const {
    data: datasetDetail,
    isError: datasetError,
    error: datasetErrorValue,
    isFetching: datasetIsFetching,
  } = useGetDatasetQuery(
    { datasetId: selectedDatasetId ?? "" },
    { skip: !selectedDatasetId },
  );
  const [searchInput, setSearchInput] = useState("");
  const [hydratedSearchParamsKey, setHydratedSearchParamsKey] = useState<
    string | null
  >(null);
  const lastWrittenQueryRef = useRef<string | null>(null);
  const skipUrlWriteRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingViewColumnsRef = useRef<{
    datasetId: string;
    columns: string[];
  } | null>(null);
  const isUrlHydrated = hydratedSearchParamsKey === searchParamsKey;
  const filtersAreValid = areConditionsValid(draft.conditions);

  useEffect(() => {
    if (lastWrittenQueryRef.current === searchParamsKey) {
      lastWrittenQueryRef.current = null;
      setHydratedSearchParamsKey(searchParamsKey);
      return;
    }

    skipUrlWriteRef.current = true;
    const restoredParams = new URLSearchParams(searchParamsKey);
    const restoredDraft = parseSearchDraft(restoredParams);
    if (!restoredParams.has("pageSize")) {
      restoredDraft.pageSize = defaultPageSize;
    }
    const shouldApply =
      hasSearchCriteria(restoredDraft) &&
      areConditionsValid(restoredDraft.conditions);

    dispatch(
      searchConfigRestored({
        draft: restoredDraft,
        apply: shouldApply,
      }),
    );
    setSearchInput(restoredDraft.search);
    setHydratedSearchParamsKey(searchParamsKey);
  }, [defaultPageSize, dispatch, searchParamsKey]);

  useEffect(() => {
    if (!isUrlHydrated) {
      return;
    }
    if (skipUrlWriteRef.current) {
      skipUrlWriteRef.current = false;
      return;
    }

    const nextQuery = serializeSearchDraft(draft).toString();
    if (nextQuery === searchParamsKey) {
      return;
    }

    lastWrittenQueryRef.current = nextQuery;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [draft, isUrlHydrated, pathname, router, searchParamsKey]);

  useEffect(() => {
    if (!isUrlHydrated || searchInput === draft.search) {
      return;
    }

    const timeout = setTimeout(() => {
      const search = searchInput.trim().slice(0, 256);
      const nextDraft = { ...draft, search, page: 1 };
      dispatch(draftUpdated({ search, page: 1 }));
      setSearchInput(search);

      if (
        areConditionsValid(nextDraft.conditions) &&
        hasSearchCriteria(nextDraft)
      ) {
        dispatch(searchDraftApplied());
      } else {
        dispatch(appliedSearchCleared());
      }
    }, 400);
    searchDebounceRef.current = timeout;

    return () => {
      clearTimeout(timeout);
      if (searchDebounceRef.current === timeout) {
        searchDebounceRef.current = null;
      }
    };
  }, [dispatch, draft, isUrlHydrated, searchInput]);

  const currentDataset =
    datasetDetail?.dataset.id === selectedDatasetId
      ? datasetDetail.dataset
      : undefined;

  useEffect(() => {
    const pending = pendingViewColumnsRef.current;
    if (!pending || currentDataset?.id !== pending.datasetId) {
      return;
    }

    const knownColumns = new Set(
      currentDataset.fields.map((field) => field.name),
    );
    dispatch(
      datasetVisibleColumnsSet({
        datasetId: pending.datasetId,
        columns: pending.columns.filter((column) => knownColumns.has(column)),
      }),
    );
    pendingViewColumnsRef.current = null;
  }, [currentDataset, dispatch]);

  const searchArgs = useMemo(
    () =>
      selectedDatasetId && isUrlHydrated && applied
        ? { datasetId: selectedDatasetId, ...applied }
        : skipToken,
    [applied, isUrlHydrated, selectedDatasetId],
  );
  const activeFilterKey = useMemo(
    () =>
      searchArgs === skipToken
        ? null
        : JSON.stringify({
            datasetId: searchArgs.datasetId,
            search: searchArgs.search,
            conditions: searchArgs.conditions,
            sort: searchArgs.sort,
          }),
    [searchArgs],
  );
  const {
    data: searchResult,
    isError: searchError,
    error: searchErrorValue,
    isFetching: searchIsFetching,
    isLoading: searchIsLoading,
  } = useSearchRecordsQuery(searchArgs);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const openRecordDetails = useCallback((recordId: string) => {
    setSelectedRecordId(recordId);
  }, []);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [resolvedFilterKey, setResolvedFilterKey] = useState<string | null>(
    null,
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fields = useMemo(
    () => currentDataset?.fields ?? [],
    [currentDataset?.fields],
  );
  const visibleSearchResult =
    activeFilterKey !== null && activeFilterKey === resolvedFilterKey
      ? searchResult
      : undefined;
  const records = useMemo(
    () => visibleSearchResult?.records ?? EMPTY_RECORDS,
    [visibleSearchResult?.records],
  );
  const searchTerm = applied?.search ?? "";
  const columns = useMemo(
    () => createColumns(fields, searchTerm, openRecordDetails),
    [fields, openRecordDetails, searchTerm],
  );
  const columnVisibility = useMemo<ColumnVisibilityState>(
    () =>
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          savedVisibleColumns === undefined
            ? defaultColumns.includes(field.name)
            : savedVisibleColumns.includes(field.name),
        ]),
      ),
    [defaultColumns, fields, savedVisibleColumns],
  );
  const visibleColumnNames = useMemo(
    () =>
      fields
        .filter((field) =>
          savedVisibleColumns === undefined
            ? defaultColumns.includes(field.name)
            : savedVisibleColumns.includes(field.name),
        )
        .map((field) => field.name),
    [defaultColumns, fields, savedVisibleColumns],
  );
  const sorting = useMemo<SortingState>(
    () =>
      (applied?.sort ?? draft.sort).map(({ field, direction }) => ({
        id: field,
        desc: direction === "desc",
      })),
    [applied?.sort, draft.sort],
  );
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: (applied?.page ?? 1) - 1,
      pageSize: applied?.pageSize ?? draft.pageSize,
    }),
    [applied?.page, applied?.pageSize, draft.pageSize],
  );
  const total = visibleSearchResult?.total ?? 0;
  const pageCount = total === 0 ? 0 : Math.ceil(total / pagination.pageSize);

  useEffect(() => {
    const datasets = datasetList?.datasets ?? [];
    if (datasets.length === 0) {
      if (selectedDatasetId) {
        dispatch(datasetSelected(null));
      }
      return;
    }

    if (!datasets.some((dataset) => dataset.id === selectedDatasetId)) {
      dispatch(datasetSelected(datasets[0].id));
    }
  }, [datasetList?.datasets, dispatch, selectedDatasetId]);

  useEffect(() => {
    setRowSelection({});
    setSelectedRecordId(null);
  }, [selectedDatasetId]);

  useEffect(() => {
    if (
      !searchIsFetching &&
      !searchError &&
      searchResult &&
      activeFilterKey !== null
    ) {
      setResolvedFilterKey(activeFilterKey);
    }
  }, [activeFilterKey, searchError, searchIsFetching, searchResult]);

  const onSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      const nextSort: SearchSort[] = [];
      for (const { id, desc } of nextSorting) {
        if (isSearchableField(id)) {
          nextSort.push({
            field: id,
            direction: desc ? "desc" : "asc",
          });
        }
      }
      const nextDraft = { ...draft, sort: nextSort, page: 1 };
      dispatch(draftUpdated({ sort: nextSort, page: 1 }));
      if (
        areConditionsValid(nextDraft.conditions) &&
        hasSearchCriteria(nextDraft)
      ) {
        dispatch(searchDraftApplied());
      } else {
        dispatch(appliedSearchCleared());
      }
    },
    [dispatch, draft, sorting],
  );

  const applyPaginationChange = useCallback(
    (updater: Updater<PaginationState>) => {
      const nextPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      dispatch(
        draftUpdated({
          page: nextPagination.pageIndex + 1,
          pageSize: nextPagination.pageSize,
        }),
      );
      const nextDraft = {
        ...draft,
        page: nextPagination.pageIndex + 1,
        pageSize: nextPagination.pageSize,
      };
      if (
        areConditionsValid(nextDraft.conditions) &&
        hasSearchCriteria(nextDraft)
      ) {
        dispatch(searchDraftApplied());
      } else {
        dispatch(appliedSearchCleared());
      }
    },
    [dispatch, draft, pagination],
  );

  const onColumnVisibilityChange = useCallback(
    (updater: Updater<ColumnVisibilityState>) => {
      if (!selectedDatasetId) {
        return;
      }
      const nextVisibility =
        typeof updater === "function" ? updater(columnVisibility) : updater;
      dispatch(
        datasetVisibleColumnsSet({
          datasetId: selectedDatasetId,
          columns: fields
            .filter((field) => nextVisibility[field.name] !== false)
            .map((field) => field.name),
        }),
      );
    },
    [columnVisibility, dispatch, fields, selectedDatasetId],
  );

  const table = useTable({
    features: tableFeaturesConfig,
    columns,
    data: records,
    getRowId: (record) => record.id,
    defaultColumn: {
      minSize: 100,
      maxSize: 480,
    },
    enableMultiSort: true,
    maxMultiSortColCount: 5,
    manualSorting: true,
    manualPagination: true,
    pageCount,
    rowCount: total,
    columnResizeMode: "onChange",
    state: {
      columnSizing,
      columnVisibility,
      pagination,
      rowSelection,
      sorting,
    },
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange,
    onPaginationChange: applyPaginationChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange,
  });
  const rows = useMemo(() => table.getRowModel().rows, [table]);
  // TanStack Virtual owns mutable measurement state and must not be memoized.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => (density === "compact" ? 40 : 52),
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 8,
  });
  const virtualRows = virtualizer.getVirtualItems();

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    const search = searchInput.trim().slice(0, 256);
    const nextDraft = { ...draft, search, page: 1 };
    dispatch(draftUpdated({ search, page: 1 }));
    setSearchInput(search);

    if (
      areConditionsValid(nextDraft.conditions) &&
      hasSearchCriteria(nextDraft)
    ) {
      dispatch(searchDraftApplied());
    } else {
      dispatch(appliedSearchCleared());
    }
  }

  function changeDataset(datasetId: string) {
    dispatch(datasetSelected(datasetId || null));
  }

  const applySavedConfiguration = useCallback(
    (datasetId: string, configuration: SavedViewConfiguration) => {
      const restoredDraft = parseSearchDraft(
        serializeSearchDraft({
          search: configuration.search ?? "",
          conditions: configuration.conditions ?? [],
          sort: configuration.sort ?? [],
          page: configuration.page ?? 1,
          pageSize: configuration.pageSize ?? 25,
        }),
      );

      if (!areConditionsValid(restoredDraft.conditions)) {
        dispatch(
          toastAdded({
            title: "View could not be applied",
            description: "The saved search configuration is invalid.",
            tone: "error",
          }),
        );
        return;
      }

      if (datasetId !== selectedDatasetId) {
        if (configuration.visibleColumns) {
          pendingViewColumnsRef.current = {
            datasetId,
            columns: configuration.visibleColumns,
          };
        }
        dispatch(datasetSelected(datasetId));
      }
      if (configuration.visibleColumns && datasetId === selectedDatasetId) {
        const knownColumns = new Set(fields.map((field) => field.name));
        dispatch(
          datasetVisibleColumnsSet({
            datasetId,
            columns: configuration.visibleColumns.filter((column) =>
              knownColumns.has(column),
            ),
          }),
        );
      }
      dispatch(
        searchConfigRestored({
          draft: restoredDraft,
          apply:
            hasSearchCriteria(restoredDraft) &&
            areConditionsValid(restoredDraft.conditions),
        }),
      );
      setSearchInput(restoredDraft.search);

      const nextQuery = serializeSearchDraft(restoredDraft).toString();
      if (nextQuery !== searchParamsKey) {
        lastWrittenQueryRef.current = nextQuery;
        skipUrlWriteRef.current = false;
        setHydratedSearchParamsKey(null);
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      } else {
        setHydratedSearchParamsKey(searchParamsKey);
      }
    },
    [dispatch, fields, pathname, router, searchParamsKey, selectedDatasetId],
  );

  function submitJumpToPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const page = Number(new FormData(event.currentTarget).get("page"));
    if (Number.isSafeInteger(page) && page >= 1 && page <= pageCount) {
      table.setPageIndex(page - 1);
    }
  }

  const hasSearch = Boolean(applied);
  const displayedPage = visibleSearchResult?.page ?? pagination.pageIndex + 1;
  const resultStart =
    total === 0 ? 0 : (displayedPage - 1) * pagination.pageSize + 1;
  const resultEnd =
    total === 0 ? 0 : Math.min(resultStart + records.length - 1, total);
  const canGoNext = visibleSearchResult
    ? visibleSearchResult.hasMore
    : table.getCanNextPage();
  const hasUnappliedChanges =
    applied !== null && JSON.stringify(draft) !== JSON.stringify(applied);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-slate-500 uppercase">
              DataScope
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Data Explorer
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Search, sort, and inspect records across your authorized datasets.
            </p>
          </div>
          <label className="flex min-w-56 flex-col gap-1.5 text-sm font-medium">
            Dataset
            <select
              aria-label="Select dataset"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 font-normal shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              disabled={datasetsLoading || !datasetList?.datasets.length}
              onChange={(event) => changeDataset(event.currentTarget.value)}
              value={selectedDatasetId ?? ""}
            >
              {!datasetList?.datasets.length && (
                <option value="">
                  {datasetsLoading ? "Loading datasets..." : "No datasets"}
                </option>
              )}
              {datasetList?.datasets.map((dataset: DatasetSummary) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </label>
        </header>
        <nav aria-label="Account navigation" className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            href="/analytics"
          >
            Analytics
          </Link>
          <Link
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            href="/settings"
          >
            User settings
          </Link>
          {role === "admin" && (
            <>
              <Link
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
                href="/admin/datasets"
              >
                Manage datasets
              </Link>
              <Link
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
                href="/admin/users"
              >
                Manage users
              </Link>
            </>
          )}
        </nav>

        {datasetsError && (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {getErrorMessage(datasetsErrorValue)}
          </p>
        )}

        {datasetError && (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {getErrorMessage(datasetErrorValue)}
          </p>
        )}

        <section
          aria-label="Record search"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={applySearch}
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search records</span>
              <Search
                aria-hidden="true"
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                className="h-11 w-full rounded-md border border-slate-300 bg-white pr-3 pl-10 text-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-500"
                maxLength={256}
                onChange={(event) => setSearchInput(event.currentTarget.value)}
                placeholder="Search name, email, status, country, or category..."
                value={searchInput}
              />
            </label>
            <button
              className="h-11 rounded-md bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedDatasetId || !filtersAreValid}
              type="submit"
            >
              Apply search
            </button>
          </form>
          <FilterBuilder
            conditions={draft.conditions}
            fields={fields}
            onChange={(conditions) => dispatch(draftUpdated({ conditions }))}
          />
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-500">
              Global search is applied 400 ms after you stop typing. Use
              Shift-click on sortable headers to add secondary sort columns.
            </p>
            {!filtersAreValid && (
              <p className="text-sm text-amber-700" role="status">
                Complete each filter value before applying the search.
              </p>
            )}
            {hasUnappliedChanges && filtersAreValid && (
              <p className="text-sm text-slate-600" role="status">
                Filter changes are pending. Apply the search to update results.
              </p>
            )}
          </div>
        </section>

        {selectedDatasetId && (
          <SavedViewsPanel
            datasetId={selectedDatasetId}
            draft={draft}
            onApply={applySavedConfiguration}
            visibleColumns={visibleColumnNames}
          />
        )}

        {searchError && (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {getErrorMessage(searchErrorValue)}
          </p>
        )}

        <section
          aria-label="Dataset records"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Records</h2>
              <span className="text-sm text-slate-500">
                {visibleSearchResult
                  ? `${total.toLocaleString()} total`
                  : hasSearch
                    ? "Loading results"
                    : "No search applied"}
              </span>
              {Object.keys(rowSelection).length > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {Object.keys(rowSelection).length} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {Object.keys(rowSelection).length > 0 && (
                <button
                  className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
                  onClick={() => setRowSelection({})}
                  type="button"
                >
                  Clear selection
                </button>
              )}
              {fields.length > 0 && (
                <details className="relative">
                  <summary className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
                    Columns
                  </summary>
                  <fieldset className="absolute right-0 z-30 mt-2 max-h-80 min-w-48 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <legend className="sr-only">Visible columns</legend>
                    <div className="space-y-2">
                      {fields.map((field) => {
                        const column = table.getColumn(field.name);
                        return (
                          <label
                            className="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap"
                            key={field.id}
                          >
                            <input
                              checked={column?.getIsVisible() ?? true}
                              className="size-4 accent-slate-900"
                              disabled={!column?.getCanHide()}
                              onChange={column?.getToggleVisibilityHandler()}
                              type="checkbox"
                            />
                            {field.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </details>
              )}
            </div>
          </div>

          {!selectedDatasetId && !datasetsLoading && !datasetsError && (
            <div className="px-6 py-16 text-center">
              <p className="font-medium">No accessible datasets</p>
              <p className="mt-1 text-sm text-slate-500">
                Ask an administrator to grant access to a dataset.
              </p>
            </div>
          )}

          {selectedDatasetId && datasetIsFetching && fields.length === 0 && (
            <TableSkeleton />
          )}

          {selectedDatasetId &&
            !datasetIsFetching &&
            currentDataset &&
            fields.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-slate-600">
                No fields are configured for this dataset. Run the seed script
                to load the demo field definitions.
              </div>
            )}

          {selectedDatasetId && !hasSearch && fields.length > 0 && (
            <div className="px-6 py-16 text-center">
              <p className="font-medium">Search this dataset to get started</p>
              <p className="mt-1 text-sm text-slate-500">
                Enter a search term above and apply it to load matching records.
              </p>
            </div>
          )}

          {selectedDatasetId &&
            hasSearch &&
            (searchIsLoading ||
              searchIsFetching ||
              (!visibleSearchResult && !searchError)) && (
              <TableSkeleton columnCount={Math.max(fields.length, 2)} />
            )}

          {hasSearch &&
            !searchIsLoading &&
            !searchError &&
            visibleSearchResult &&
            records.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="font-medium">No matching records</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try another search term or adjust your filters.
                </p>
              </div>
            )}

          {records.length > 0 && (
            <>
              <div className="relative">
                <div
                  className="max-h-[min(65vh,680px)] overflow-auto"
                  ref={scrollContainerRef}
                >
                  <table
                    aria-label="Search results"
                    className="grid border-separate border-spacing-0"
                    style={{ display: "grid", width: table.getTotalSize() }}
                  >
                    <thead
                      className="sticky top-0 z-10 bg-slate-50"
                      style={{ display: "grid" }}
                    >
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr
                          className="border-b border-slate-200"
                          key={headerGroup.id}
                          style={{ display: "flex", width: "100%" }}
                        >
                          {headerGroup.headers.map((header) => {
                            const sortDirection = header.column.getIsSorted();
                            const sortIndex = header.column.getSortIndex();
                            const sortHandler =
                              header.column.getToggleSortingHandler();
                            return (
                              <th
                                aria-sort={
                                  sortDirection === "asc"
                                    ? "ascending"
                                    : sortDirection === "desc"
                                      ? "descending"
                                      : "none"
                                }
                                className="relative flex shrink-0 items-center px-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
                                key={header.id}
                                style={{
                                  boxSizing: "border-box",
                                  height: 44,
                                  width: header.getSize(),
                                }}
                              >
                                {header.isPlaceholder ? null : (
                                  <button
                                    aria-label={`${String(header.column.columnDef.header)}${sortDirection ? `, sorted ${sortDirection}${sortIndex > 0 ? `, priority ${sortIndex + 1}` : ""}` : ""}`}
                                    className="flex min-w-0 items-center gap-1 truncate disabled:cursor-default"
                                    disabled={!header.column.getCanSort()}
                                    onClick={sortHandler}
                                    title={
                                      header.column.getCanSort()
                                        ? "Click to sort; Shift-click to add a secondary sort"
                                        : undefined
                                    }
                                    type="button"
                                  >
                                    <table.FlexRender header={header} />
                                    {sortDirection && (
                                      <span
                                        aria-hidden="true"
                                        className="text-slate-900"
                                      >
                                        {sortDirection === "asc" ? "↑" : "↓"}
                                        {sortIndex > 0 ? sortIndex + 1 : ""}
                                      </span>
                                    )}
                                  </button>
                                )}
                                {header.column.getCanResize() && (
                                  <div
                                    aria-label={`Resize ${String(header.column.columnDef.header)} column`}
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize touch-none select-none"
                                    onMouseDown={header.getResizeHandler()}
                                    onTouchStart={header.getResizeHandler()}
                                    role="separator"
                                  />
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody
                      style={{
                        display: "grid",
                        height: virtualizer.getTotalSize(),
                        position: "relative",
                      }}
                    >
                      {virtualRows.map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        if (!row) {
                          return null;
                        }

                        return (
                          <tr
                            aria-selected={row.getIsSelected()}
                            className={`absolute flex w-full border-b border-slate-100 hover:bg-slate-50 ${density === "compact" ? "h-10" : "h-[52px]"}`}
                            data-index={virtualRow.index}
                            key={row.id}
                            style={{
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                className="flex shrink-0 items-center px-3 text-sm text-slate-700"
                                key={cell.id}
                                style={{
                                  boxSizing: "border-box",
                                  width: cell.column.getSize(),
                                }}
                              >
                                <table.FlexRender cell={cell} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {searchIsFetching && visibleSearchResult && (
                  <div
                    aria-live="polite"
                    className="absolute inset-x-0 bottom-0 flex justify-center bg-white/80 py-2 text-xs font-medium text-slate-600"
                  >
                    Updating results; previous rows remain visible.
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-slate-600" aria-live="polite">
                  Showing {resultStart.toLocaleString()}–
                  {resultEnd.toLocaleString()} of {total.toLocaleString()}
                  {searchIsFetching ? " · Updating..." : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-slate-600">
                    Rows
                    <select
                      aria-label="Rows per page"
                      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-slate-900"
                      onChange={(event) =>
                        table.setPageSize(Number(event.currentTarget.value))
                      }
                      value={pagination.pageSize}
                    >
                      {[25, 50, 100].map((pageSize) => (
                        <option key={pageSize} value={pageSize}>
                          {pageSize}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    aria-label="Previous page"
                    className="h-9 rounded-md border border-slate-300 px-3 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={pagination.pageIndex === 0 || searchIsFetching}
                    onClick={() => table.previousPage()}
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="whitespace-nowrap text-slate-600">
                    Page {displayedPage}
                    {pageCount > 0 ? ` of ${pageCount.toLocaleString()}` : ""}
                  </span>
                  <button
                    aria-label="Next page"
                    className="h-9 rounded-md border border-slate-300 px-3 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canGoNext || searchIsFetching}
                    onClick={() => table.nextPage()}
                    type="button"
                  >
                    Next
                  </button>
                  <form
                    className="flex items-center gap-1.5"
                    onSubmit={submitJumpToPage}
                  >
                    <label className="sr-only" htmlFor="jump-to-page">
                      Jump to page
                    </label>
                    <input
                      className="h-9 w-16 rounded-md border border-slate-300 px-2 text-center"
                      id="jump-to-page"
                      inputMode="numeric"
                      max={Math.max(pageCount, 1)}
                      min={1}
                      name="page"
                      placeholder="Page"
                      type="number"
                    />
                    <button
                      className="h-9 rounded-md border border-slate-300 px-3 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={pageCount <= 1 || searchIsFetching}
                      type="submit"
                    >
                      Go
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      {selectedDatasetId && selectedRecordId && (
        <RecordDetailErrorBoundary
          key={`${selectedDatasetId}:${selectedRecordId}`}
          onClose={() => setSelectedRecordId(null)}
        >
          <RecordDetailDrawer
            datasetId={selectedDatasetId}
            fields={fields}
            onClose={() => setSelectedRecordId(null)}
            recordId={selectedRecordId}
          />
        </RecordDetailErrorBoundary>
      )}
    </main>
  );
}
