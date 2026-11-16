import Link from "next/link";

export function AdminNavigation() {
  return (
    <nav aria-label="Admin pages" className="flex flex-wrap gap-2">
      <Link
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        href="/admin/datasets"
      >
        Datasets
      </Link>
      <Link
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        href="/admin/users"
      >
        Users
      </Link>
      <Link
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        href="/settings"
      >
        My settings
      </Link>
    </nav>
  );
}
