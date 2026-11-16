"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Database,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { datasetSelected } from "@/features/datasets/datasetSlice";
import {
  useGetAnalyticsQuery,
  useGetDatasetsQuery,
  useGetSearchHistoryQuery,
} from "@/lib/api/dataApi";
import type { SearchHistoryEntry } from "@/lib/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function currency(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount)
    : value;
}

function getErrorMessage(error: unknown) {
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
  if (error instanceof Error) return error.message;
  return "The dashboard data could not be loaded.";
}

function getQueryLabel(entry: SearchHistoryEntry) {
  if (entry.query.search.trim()) return entry.query.search;
  if (entry.query.conditions.length === 0) return "All records";
  return entry.query.conditions
    .map(({ field, operator, value }) => {
      const formatted = Array.isArray(value) ? value.join(", ") : String(value);
      return `${field} ${operator} ${formatted}`;
    })
    .join(" · ");
}

function RecentSearch({ entry }: { entry: SearchHistoryEntry }) {
  const date = new Date(entry.executedAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 sm:px-5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
        <Search aria-hidden="true" size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-slate-800 group-hover:text-slate-950">
          {getQueryLabel(entry)}
        </span>
        <span className="mt-1 block truncate text-[10px] text-slate-500">
          {entry.datasetName} <span className="px-1 text-slate-300">/</span>{" "}
          {dateLabel}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-xs font-medium text-slate-700 tabular-nums">
          {number(entry.resultCount)}
        </span>
        <span className="text-[9px] text-slate-500">results</span>
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: "slate" | "teal" | "blue" | "amber";
}) {
  const iconTones = {
    slate: "bg-slate-100 text-slate-600",
    teal: "bg-teal-50 text-teal-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[25px] leading-none font-semibold tracking-tight text-slate-950 tabular-nums">
            {value}
          </p>
        </div>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-md ${iconTones[tone]}`}
        >
          <Icon aria-hidden="true" size={15} />
        </span>
      </div>
      <p className="mt-3 truncate text-[10px] text-slate-500">{note}</p>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading overview" className="space-y-5">
      <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white"
            key={index}
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
        <div className="h-[340px] animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-[340px] animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

export function OverviewDashboard() {
  const dispatch = useAppDispatch();
  const selectedDatasetId = useAppSelector(
    (state) => state.dataset.selectedDatasetId,
  );
  const {
    data: datasetsResponse,
    error: datasetsError,
    isError: datasetsErrorState,
    isLoading: datasetsLoading,
    refetch: refetchDatasets,
  } = useGetDatasetsQuery();
  const datasets = datasetsResponse?.datasets ?? [];
  const activeDataset =
    datasets.find(({ id }) => id === selectedDatasetId) ?? datasets[0] ?? null;
  const {
    data: analytics,
    error: analyticsError,
    isError: analyticsErrorState,
    isFetching: analyticsFetching,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useGetAnalyticsQuery(
    { datasetId: activeDataset?.id ?? "" },
    { skip: !activeDataset },
  );
  const {
    data: historyResponse,
    error: historyError,
    isError: historyErrorState,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useGetSearchHistoryQuery(
    { limit: 5 },
    { skip: datasetsLoading || datasetsErrorState },
  );
  const history = historyResponse?.history ?? [];

  useEffect(() => {
    if (activeDataset && activeDataset.id !== selectedDatasetId) {
      dispatch(datasetSelected(activeDataset.id));
    }
  }, [activeDataset, dispatch, selectedDatasetId]);

  if (datasetsLoading) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <DashboardSkeleton />
      </main>
    );
  }

  const searchActivity = analytics?.searchActivity ?? [];
  const searchTotal = searchActivity.reduce(
    (sum: number, day: { searches: number }) => sum + day.searches,
    0,
  );
  const chartData = searchActivity.map(
    (item: { date: string; searches: number }) => ({
      ...item,
      label: new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(`${item.date}T00:00:00`)),
    }),
  );

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Workspace overview
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Good to see you.
          </h2>
          <p className="mt-1.5 text-xs text-slate-600 sm:text-sm">
            A current view of your accessible data and recent work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeDataset && (
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] text-slate-500">
              <Database aria-hidden="true" size={14} />
              <span className="hidden sm:inline">Dataset</span>
              <select
                aria-label="Select overview dataset"
                className="max-w-[180px] border-0 bg-transparent py-0 pr-5 text-xs font-medium text-slate-800 outline-none focus:ring-0"
                onChange={(event) =>
                  dispatch(datasetSelected(event.currentTarget.value || null))
                }
                value={activeDataset.id}
              >
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            onClick={() => {
              void refetchDatasets();
              void refetchHistory();
              if (activeDataset) void refetchAnalytics();
            }}
            type="button"
          >
            <Activity aria-hidden="true" size={14} />
            Refresh
          </button>
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            href="/explorer"
          >
            <Search aria-hidden="true" size={14} />
            Explore data
          </Link>
        </div>
      </header>

      {datasetsErrorState && (
        <p
          className="mb-5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800"
          role="alert"
        >
          {getErrorMessage(datasetsError)}
        </p>
      )}

      {!datasetsErrorState && datasets.length === 0 && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <Database aria-hidden="true" size={18} />
          </span>
          <h2 className="mt-4 text-sm font-semibold">No datasets available</h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-600">
            Once a dataset is shared with your account, it will appear here with
            its latest activity and summary.
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 hover:text-teal-800"
            href="/explorer"
          >
            Open data explorer <ArrowRight aria-hidden="true" size={13} />
          </Link>
        </section>
      )}

      {activeDataset && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Database}
              label="Records in dataset"
              note={activeDataset.name}
              tone="slate"
              value={number(
                analytics?.recordCount ?? activeDataset.recordCount,
              )}
            />
            <MetricCard
              icon={BarChart3}
              label="Recorded revenue"
              note="Aggregate across this dataset"
              tone="teal"
              value={analytics ? currency(analytics.revenueTotal) : "—"}
            />
            <MetricCard
              icon={Search}
              label="Searches · 30 days"
              note="Based on recorded search activity"
              tone="blue"
              value={analytics ? number(searchTotal) : "—"}
            />
            <MetricCard
              icon={ArrowUpRight}
              label="Accessible datasets"
              note="Available to your account"
              tone="amber"
              value={number(datasets.length)}
            />
          </div>

          {analyticsErrorState && (
            <p
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800"
              role="alert"
            >
              {getErrorMessage(analyticsError)}
            </p>
          )}
          {analyticsFetching && !analytics && (
            <p className="mb-3 text-[11px] text-slate-500" role="status">
              Loading dataset metrics…
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
            <section className="min-w-0 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Search activity
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Daily searches over the last 30 days
                  </p>
                </div>
                <Link
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 hover:text-slate-950"
                  href="/analytics"
                >
                  Full analytics <ArrowUpRight aria-hidden="true" size={12} />
                </Link>
              </div>
              <div className="h-[270px] px-2 py-4 sm:px-4">
                {analyticsLoading && !analytics ? (
                  <div
                    aria-label="Loading search activity"
                    aria-busy="true"
                    className="h-full animate-pulse rounded bg-slate-50"
                  />
                ) : chartData.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="flex size-9 items-center justify-center rounded-md bg-slate-50 text-slate-400">
                      <Activity aria-hidden="true" size={16} />
                    </span>
                    <p className="mt-3 text-xs font-medium text-slate-700">
                      No search activity yet
                    </p>
                    <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-500">
                      Searches run in the data explorer will appear here.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
                    >
                      <CartesianGrid
                        stroke="#e9edf2"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        axisLine={false}
                        dataKey="label"
                        minTickGap={24}
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickLine={false}
                        width={38}
                      />
                      <Tooltip
                        contentStyle={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 6,
                          fontSize: 11,
                          boxShadow: "0 4px 12px rgba(15,23,42,.08)",
                        }}
                        formatter={(value) => [
                          number(Number(value)),
                          "Searches",
                        ]}
                      />
                      <Line
                        activeDot={{ r: 4, fill: "#0f766e", strokeWidth: 0 }}
                        dataKey="searches"
                        name="Searches"
                        stroke="#0f766e"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Recent searches
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Your latest queries across datasets
                  </p>
                </div>
                <Link
                  aria-label="Open data explorer"
                  className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  href="/explorer"
                >
                  <ArrowUpRight aria-hidden="true" size={14} />
                </Link>
              </div>
              {historyLoading ? (
                <div aria-busy="true" className="space-y-3 p-5">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      className="h-10 animate-pulse rounded bg-slate-100"
                      key={index}
                    />
                  ))}
                </div>
              ) : historyErrorState ? (
                <p className="px-5 py-8 text-xs text-slate-600" role="alert">
                  {getErrorMessage(historyError)}
                </p>
              ) : history.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
                  <span className="flex size-9 items-center justify-center rounded-md bg-slate-50 text-slate-400">
                    <Search aria-hidden="true" size={16} />
                  </span>
                  <p className="mt-3 text-xs font-medium text-slate-700">
                    Your query history is empty
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Run a search to see it here.
                  </p>
                </div>
              ) : (
                <div>
                  {history.map((entry) => (
                    <RecentSearch entry={entry} key={entry.id} />
                  ))}
                  <Link
                    className="flex items-center justify-center gap-1.5 border-t border-slate-200 px-4 py-3 text-[10px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    href="/explorer"
                  >
                    Browse all data <ArrowRight aria-hidden="true" size={12} />
                  </Link>
                </div>
              )}
            </section>
          </div>

          <section className="mt-4 rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <Database aria-hidden="true" size={15} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    {activeDataset.name}
                  </p>
                  <p className="mt-1 max-w-xl text-[10px] leading-4 text-slate-500">
                    {activeDataset.description ||
                      "Browse the records and fields available in this dataset."}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="mr-1 text-[10px] text-slate-500 tabular-nums">
                  {number(activeDataset.recordCount)} records
                </span>
                <Link
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                  href="/analytics"
                >
                  Insights <ArrowDownRight aria-hidden="true" size={12} />
                </Link>
                <Link
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-950 px-2.5 text-[10px] font-medium text-white hover:bg-slate-800"
                  href="/explorer"
                >
                  Explore <ArrowRight aria-hidden="true" size={12} />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
