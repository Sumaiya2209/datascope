"use client";

import { ChevronDown, Eye, X } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  DatasetField,
  DatasetRecord,
  RecordHistoryEntry,
} from "@/lib/api/types";
import {
  useGetRecordQuery,
  useGetRecordRelationshipsQuery,
  useLazyGetRecordHistoryQuery,
} from "@/lib/api/dataApi";

type Props = {
  datasetId: string;
  recordId: string;
  fields: DatasetField[];
  onClose: () => void;
};

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

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2) ?? String(value);
  }
  return String(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function getFieldValue(name: string, record: DatasetRecord): unknown {
  switch (name) {
    case "status":
    case "country":
    case "category":
    case "revenue":
    case "name":
    case "email":
      return record[name];
    case "created_at":
      return record.createdAt;
    case "updated_at":
      return record.updatedAt;
    default:
      return record.extra[name];
  }
}

function RecordDetailSkeleton() {
  return (
    <div
      aria-label="Loading record details"
      aria-busy="true"
      className="space-y-5 p-6"
    >
      <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
      </div>
      {Array.from({ length: 7 }, (_, index) => (
        <div className="space-y-2" key={index}>
          <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function InlineSkeleton() {
  return (
    <div aria-busy="true" className="space-y-3 py-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="h-12 animate-pulse rounded-lg bg-slate-100"
          key={index}
        />
      ))}
    </div>
  );
}

function HistoryEntry({ entry }: { entry: RecordHistoryEntry }) {
  return (
    <li className="relative border-l border-slate-200 pb-5 pl-4 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute top-1 left-[-5px] size-2.5 rounded-full bg-slate-400"
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium capitalize">{entry.operation}</p>
        <time
          className="text-xs text-slate-500"
          dateTime={entry.createdAt}
          title={formatDate(entry.createdAt)}
        >
          {formatDate(entry.createdAt)}
        </time>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {entry.changedBy?.name ?? "System"}
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-700">
          View changes
        </summary>
        <pre className="mt-2 overflow-auto rounded-md bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-700">
          {JSON.stringify(entry.changes, null, 2)}
        </pre>
      </details>
    </li>
  );
}

export function RecordDetailDrawer({
  datasetId,
  recordId,
  fields,
  onClose,
}: Props) {
  const {
    data: recordResponse,
    error: recordError,
    isError: recordIsError,
    isLoading: recordIsLoading,
    refetch: refetchRecord,
  } = useGetRecordQuery({ datasetId, recordId });
  const record = recordResponse?.record;
  const [relationshipsOpen, setRelationshipsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<RecordHistoryEntry[]>(
    [],
  );
  const [historyPage, setHistoryPage] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadRecordHistory, historyRequest] = useLazyGetRecordHistoryQuery();
  const {
    data: relationshipsResponse,
    error: relationshipsError,
    isError: relationshipsIsError,
    isFetching: relationshipsIsFetching,
    refetch: refetchRelationships,
  } = useGetRecordRelationshipsQuery(
    { datasetId, recordId },
    { skip: !relationshipsOpen },
  );

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function loadHistoryPage(page: number) {
    const result = await loadRecordHistory({ datasetId, recordId, page });
    if (!("data" in result) || !result.data) {
      return;
    }
    const data = result.data;

    setHistoryEntries((current) =>
      page === 1 ? data.history : [...current, ...data.history],
    );
    setHistoryPage(page);
    setHistoryHasMore(data.hasMore);
    setHistoryLoaded(true);
  }

  function toggleHistory() {
    const opening = !historyOpen;
    setHistoryOpen(opening);
    if (opening && !historyLoaded && !historyRequest.isFetching) {
      void loadHistoryPage(1);
    }
  }

  const coreValues: Record<string, unknown> = record
    ? {
        status: record.status,
        country: record.country,
        category: record.category,
        revenue: record.revenue,
        name: record.name,
        email: record.email,
      }
    : {};
  const configuredFields = new Set(fields.map((field) => field.name));
  const detailRows = record
    ? [
        ...fields
          .filter(
            (field) =>
              field.name !== "created_at" && field.name !== "updated_at",
          )
          .map((field) => ({
            label: field.label,
            value: getFieldValue(field.name, record),
          })),
        ...Object.entries(coreValues)
          .filter(([name]) => !configuredFields.has(name))
          .map(([label, value]) => ({ label, value })),
        ...Object.entries(record.extra)
          .filter(
            ([name]) => !configuredFields.has(name) && !(name in coreValues),
          )
          .map(([label, value]) => ({ label, value })),
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        aria-label="Close record details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="record-detail-title"
        aria-modal="true"
        className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Record details
            </p>
            <h2
              className="mt-1 truncate text-xl font-semibold"
              id="record-detail-title"
            >
              {record?.name ?? "Record"}
            </h2>
          </div>
          <button
            aria-label="Close record details"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {recordIsLoading && <RecordDetailSkeleton />}
          {recordIsError && !record && (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800" role="alert">
                {getErrorMessage(recordError)}
              </p>
              <button
                className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100"
                onClick={() => void refetchRecord()}
                type="button"
              >
                Try again
              </button>
            </div>
          )}
          {recordIsError && record && (
            <p
              className="m-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              role="status"
            >
              The latest record refresh failed: {getErrorMessage(recordError)}
            </p>
          )}
          {record && (
            <div className="space-y-6 p-5">
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-medium text-slate-500">
                    Created
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    <time dateTime={record.createdAt}>
                      {formatDate(record.createdAt)}
                    </time>
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-medium text-slate-500">
                    Updated
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    <time dateTime={record.updatedAt}>
                      {formatDate(record.updatedAt)}
                    </time>
                  </dd>
                </div>
              </dl>

              <section aria-labelledby="record-fields-title">
                <h3
                  className="mb-3 text-sm font-semibold"
                  id="record-fields-title"
                >
                  Record information
                </h3>
                <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[minmax(7rem,0.7fr)_minmax(0,1.3fr)] gap-3 px-3 py-2.5">
                    <dt className="text-sm text-slate-500">Record ID</dt>
                    <dd className="text-sm break-all text-slate-900">
                      {record.id}
                    </dd>
                  </div>
                  {detailRows.map(({ label, value }, index) => (
                    <div
                      className="grid grid-cols-[minmax(7rem,0.7fr)_minmax(0,1.3fr)] gap-3 px-3 py-2.5"
                      key={`${label}-${index}`}
                    >
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="text-sm break-words text-slate-900">
                        {formatValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="border-t border-slate-200 pt-4">
                <button
                  aria-controls="record-relationships"
                  aria-expanded={relationshipsOpen}
                  className="flex w-full items-center justify-between gap-3 text-left font-semibold"
                  onClick={() => setRelationshipsOpen((open) => !open)}
                  type="button"
                >
                  <span>Related records</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 transition-transform ${relationshipsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {relationshipsOpen && (
                  <div id="record-relationships">
                    {relationshipsIsFetching && <InlineSkeleton />}
                    {relationshipsIsError && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                        <p className="text-sm text-red-800" role="alert">
                          {getErrorMessage(relationshipsError)}
                        </p>
                        <button
                          className="mt-2 text-sm font-medium text-red-900 underline"
                          onClick={() => void refetchRelationships()}
                          type="button"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    {!relationshipsIsFetching &&
                      !relationshipsIsError &&
                      (relationshipsResponse?.relationships.length ?? 0) ===
                        0 && (
                        <p className="py-4 text-sm text-slate-500">
                          No related records.
                        </p>
                      )}
                    <ul className="divide-y divide-slate-100">
                      {relationshipsResponse?.relationships.map(
                        (relationship) => (
                          <li className="py-3" key={relationship.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {relationship.record.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {relationship.direction === "outgoing"
                                    ? "Outgoing"
                                    : "Incoming"}{" "}
                                  · {relationship.relationshipType} ·{" "}
                                  {relationship.record.status}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs text-slate-400">
                                {relationship.record.id.slice(0, 8)}
                              </span>
                            </div>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </section>

              <section className="border-t border-slate-200 pt-4">
                <button
                  aria-controls="record-history"
                  aria-expanded={historyOpen}
                  className="flex w-full items-center justify-between gap-3 text-left font-semibold"
                  onClick={toggleHistory}
                  type="button"
                >
                  <span>Change history</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 transition-transform ${historyOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {historyOpen && (
                  <div id="record-history">
                    {historyRequest.isFetching && <InlineSkeleton />}
                    {historyRequest.isError && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                        <p className="text-sm text-red-800" role="alert">
                          {getErrorMessage(historyRequest.error)}
                        </p>
                        <button
                          className="mt-2 text-sm font-medium text-red-900 underline"
                          onClick={() => void loadHistoryPage(historyPage || 1)}
                          type="button"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    {historyLoaded && historyEntries.length === 0 && (
                      <p className="py-4 text-sm text-slate-500">
                        No changes have been recorded.
                      </p>
                    )}
                    <ol className="mt-4">
                      {historyEntries.map((entry) => (
                        <HistoryEntry entry={entry} key={entry.id} />
                      ))}
                    </ol>
                    {historyHasMore && (
                      <button
                        className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                        disabled={historyRequest.isFetching}
                        onClick={() => void loadHistoryPage(historyPage + 1)}
                        type="button"
                      >
                        Load older changes
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export function ViewRecordButton({
  recordId,
  recordName,
  onOpen,
}: {
  recordId: string;
  recordName: string;
  onOpen: (recordId: string) => void;
}) {
  return (
    <button
      aria-label={`View details for ${recordName}`}
      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-500"
      onClick={() => onOpen(recordId)}
      title="View record details"
      type="button"
    >
      <Eye aria-hidden="true" className="size-4" />
    </button>
  );
}
