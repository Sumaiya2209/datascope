"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetAnalyticsQuery, useGetDatasetsQuery } from "@/lib/api/dataApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { datasetSelected } from "@/features/datasets/datasetSlice";
import type { AnalyticsOverview } from "@/lib/api/types";

const CHART_COLORS = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#7c3aed",
  "#e11d48",
  "#0891b2",
  "#65a30d",
  "#9333ea",
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return value;
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function ChartSkeleton() {
  return (
    <div
      aria-label="Loading analytics"
      aria-busy="true"
      className="grid gap-5 lg:grid-cols-2"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white"
          key={index}
        />
      ))}
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-5 h-64 min-w-0">{children}</div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function ErrorMessage({ error }: { error: unknown }) {
  let message = "Analytics could not be loaded.";
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "error" in error.data &&
    typeof error.data.error === "string"
  ) {
    message = error.data.error;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <p
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      {message}
    </p>
  );
}

function AnalyticsCharts({ analytics }: { analytics: AnalyticsOverview }) {
  const categoryData = analytics.categoryBreakdown.map((item) => ({
    name: item.category,
    count: item.count,
  }));
  const statusData = analytics.statusBreakdown.map((item) => ({
    name: item.status,
    count: item.count,
  }));
  const growthData = analytics.monthlyGrowth.map((item) => ({
    ...item,
    label: new Date(`${item.month}-01T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    }),
  }));
  const activityData = analytics.searchActivity.map((item) => ({
    ...item,
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));
  const filterData = analytics.mostUsedFilters.map((item) => ({
    ...item,
    label: `${item.field} · ${item.operator}`,
  }));
  const countryData = analytics.countryBreakdown.map((item) => ({
    name: item.country,
    count: item.count,
  }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total records</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatNumber(analytics.recordCount)}
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total recorded revenue
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatCurrency(analytics.revenueTotal)}
          </p>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          description="Record creation totals grouped by calendar month."
          title="Monthly growth"
        >
          {growthData.length === 0 ? (
            <EmptyChart message="No records are available for this dataset." />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={growthData} margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => [
                    formatNumber(Number(value)),
                    "Records",
                  ]}
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="count"
                  name="Records"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          description="Successful searches recorded during the last 30 days."
          title="Search activity"
        >
          {activityData.length === 0 ? (
            <EmptyChart message="No search activity has been recorded yet." />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={activityData} margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  minTickGap={20}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => [
                    formatNumber(Number(value)),
                    "Searches",
                  ]}
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="searches"
                  name="Searches"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          description="Record distribution across dataset categories."
          title="Records by category"
        >
          {categoryData.length === 0 ? (
            <EmptyChart message="No category data is available." />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ left: 12, right: 20 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  allowDecimals={false}
                  type="number"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  width={105}
                />
                <Tooltip
                  formatter={(value) => [
                    formatNumber(Number(value)),
                    "Records",
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="#2563eb"
                  name="Records"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          description="The most frequently used field and operator combinations."
          title="Most-used filters"
        >
          {filterData.length === 0 ? (
            <EmptyChart message="Filter usage will appear after searches are run." />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={filterData}
                layout="vertical"
                margin={{ left: 12, right: 20 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  allowDecimals={false}
                  type="number"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  dataKey="label"
                  type="category"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  width={135}
                />
                <Tooltip
                  formatter={(value) => [formatNumber(Number(value)), "Uses"]}
                />
                <Bar
                  dataKey="uses"
                  fill="#7c3aed"
                  name="Uses"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          description="The 15 countries with the largest record counts."
          title="Records by country"
        >
          {countryData.length === 0 ? (
            <EmptyChart message="No country data is available." />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={countryData}
                  dataKey="count"
                  nameKey="name"
                  outerRadius="78%"
                >
                  {countryData.map((item, index) => (
                    <Cell
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      key={item.name}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    formatNumber(Number(value)),
                    "Records",
                  ]}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          description="Record counts grouped by their current status."
          title="Records by status"
        >
          {statusData.length === 0 ? (
            <EmptyChart message="No status data is available." />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={statusData} margin={{ left: 0, right: 12 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  width={45}
                />
                <Tooltip
                  formatter={(value) => [
                    formatNumber(Number(value)),
                    "Records",
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="#d97706"
                  name="Records"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </>
  );
}

export function AnalyticsDashboard() {
  const dispatch = useAppDispatch();
  const selectedDatasetId = useAppSelector(
    (state) => state.dataset.selectedDatasetId,
  );
  const {
    data: datasetsResponse,
    error: datasetsError,
    isError: datasetsIsError,
    isLoading: datasetsIsLoading,
  } = useGetDatasetsQuery();
  const datasets = datasetsResponse?.datasets ?? [];
  const activeDatasetId =
    datasets.find((dataset) => dataset.id === selectedDatasetId)?.id ??
    datasets[0]?.id ??
    null;
  const {
    data: analytics,
    error: analyticsError,
    isError: analyticsIsError,
    isFetching: analyticsIsFetching,
    isLoading: analyticsIsLoading,
  } = useGetAnalyticsQuery(
    { datasetId: activeDatasetId ?? "" },
    { skip: !activeDatasetId },
  );

  if (
    datasetsIsLoading ||
    (activeDatasetId !== null && analyticsIsLoading && !analytics)
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <ChartSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-slate-500 uppercase">
              DataScope
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Analytics
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Aggregated insights from authorized datasets.
            </p>
          </div>
          <label className="flex min-w-56 flex-col gap-1.5 text-sm font-medium">
            Dataset
            <select
              aria-label="Select analytics dataset"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 font-normal shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              disabled={datasets.length === 0}
              onChange={(event) =>
                dispatch(datasetSelected(event.currentTarget.value || null))
              }
              value={activeDatasetId ?? ""}
            >
              {datasets.length === 0 && <option value="">No datasets</option>}
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </label>
        </header>

        {datasetsIsError && <ErrorMessage error={datasetsError} />}
        {datasets.length === 0 && !datasetsIsError && (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            No accessible datasets are available.
          </p>
        )}
        {activeDatasetId && analyticsIsError && (
          <ErrorMessage error={analyticsError} />
        )}
        {activeDatasetId && analyticsIsFetching && analytics && (
          <p className="text-xs text-slate-500" role="status">
            Refreshing analytics…
          </p>
        )}
        {analytics && <AnalyticsCharts analytics={analytics} />}
      </div>
    </main>
  );
}
