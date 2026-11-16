import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Database,
  Filter,
  Search,
  ShieldCheck,
} from "lucide-react";

const sampleRows = [
  {
    name: "Northwind renewal",
    status: "Active",
    region: "North America",
    value: "$84,200",
  },
  {
    name: "Atlas expansion",
    status: "Review",
    region: "Europe",
    value: "$61,750",
  },
  {
    name: "Meridian account",
    status: "Active",
    region: "Asia Pacific",
    value: "$43,100",
  },
  {
    name: "Cedar opportunity",
    status: "Pending",
    region: "North America",
    value: "$27,900",
  },
];

const capabilities = [
  {
    icon: Search,
    title: "Find the signal",
    description:
      "Search across records, compose precise filters, and keep the query visible in the URL.",
  },
  {
    icon: Braces,
    title: "Understand the shape",
    description:
      "Explore typed fields and record relationships without losing the context of your dataset.",
  },
  {
    icon: ShieldCheck,
    title: "Work within your access",
    description:
      "Dataset visibility and actions follow your team's role and permission grants.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8fa] text-slate-950">
      <header className="mx-auto flex h-16 max-w-[1440px] items-center justify-between border-b border-slate-200/80 px-5 sm:px-8 lg:px-12">
        <Link
          aria-label="DataScope home"
          className="flex items-center gap-2.5"
          href="/"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-slate-950 text-white">
            <Database aria-hidden="true" size={17} strokeWidth={2.2} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            DataScope
          </span>
          <span className="ml-1 hidden border-l border-slate-200 pl-3 text-xs text-slate-500 sm:inline">
            Data workspace
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <Link
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            href="/register"
          >
            Get started <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pt-14 pb-16 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(500px,1.1fr)] lg:items-center lg:gap-16 lg:px-12 lg:pt-24 lg:pb-24">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
            <span className="size-1.5 rounded-full bg-teal-600" />A clearer view
            of your data
          </p>
          <h1 className="max-w-xl text-[clamp(2.75rem,6vw,5.25rem)] leading-[0.99] font-semibold tracking-[-0.065em] text-slate-950">
            Make your data
            <br className="hidden sm:block" /> easier to{" "}
            <span className="text-slate-500">see.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-[17px]">
            A focused workspace for discovering records, asking better
            questions, and understanding what is changing across your datasets.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              href="/register"
            >
              Open your workspace <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              href="/login"
            >
              Sign in to DataScope
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" size={14} /> Permission-aware by
              design
            </span>
            <span className="hidden size-1 rounded-full bg-slate-300 sm:block" />
            <span>Built for real-world datasets</span>
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(203,213,225,0.38),transparent_68%)]" />
          <section
            aria-label="Example dataset preview"
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.38)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <Database aria-hidden="true" size={17} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    Revenue operations
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Example dataset · 12,480 records
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">
                Example preview
              </span>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
              {[
                ["Records", "12,480", "+8.4%"],
                ["Active", "8,204", "65.7%"],
                ["Revenue", "$2.84M", "This quarter"],
              ].map(([label, value, note]) => (
                <div className="min-w-0 px-3 py-4 sm:px-5 sm:py-5" key={label}>
                  <p className="truncate text-[10px] font-medium tracking-wide text-slate-500 uppercase sm:text-[11px]">
                    {label}
                  </p>
                  <p className="mt-1.5 truncate text-lg font-semibold tracking-tight sm:text-2xl">
                    {value}
                  </p>
                  <p className="mt-1 truncate text-[10px] text-slate-500 sm:text-xs">
                    {note}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
              <div>
                <p className="text-xs font-semibold">Latest records</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  A small preview of a searchable dataset
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
                <Filter aria-hidden="true" size={12} /> 2 filters
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[510px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                    <th className="px-5 py-2.5">Record name</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Region</th>
                    <th className="px-5 py-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row) => (
                    <tr
                      className="border-b border-slate-100 last:border-0"
                      key={row.name}
                    >
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {row.name}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <span
                            className={`size-1.5 rounded-full ${row.status === "Active" ? "bg-emerald-500" : row.status === "Review" ? "bg-amber-500" : "bg-slate-400"}`}
                          />
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{row.region}</td>
                      <td className="px-5 py-3 text-right font-mono text-[11px] text-slate-700">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-[10px] text-slate-500 sm:px-5">
              <span>Showing 4 of 12,480 records</span>
              <span className="inline-flex items-center gap-1">
                Example preview <ArrowUpRight aria-hidden="true" size={12} />
              </span>
            </div>
          </section>
          <div className="absolute -right-2 -bottom-5 hidden rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-lg sm:block lg:-right-5">
            <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
              Search response
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
              42 ms
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-3 md:gap-7 lg:px-12 lg:py-12">
          {capabilities.map(({ icon: Icon, title, description }, index) => (
            <article className="flex gap-4" key={title}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                <Icon aria-hidden="true" size={17} />
              </span>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  0{index + 1}
                </p>
                <h2 className="mt-1 text-sm font-semibold">{title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span>DataScope · A workspace for better data decisions</span>
        <Link
          className="w-fit font-medium text-slate-700 hover:text-slate-950"
          href="/login"
        >
          Sign in to your account
        </Link>
      </footer>
    </main>
  );
}
