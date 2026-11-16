import { DatasetManager } from "@/features/admin/components/dataset-manager";
import { AdminNavigation } from "@/features/admin/components/admin-navigation";

export default function AdminDatasetsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Administration
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Datasets
            </h1>
          </div>
          <AdminNavigation />
        </header>
        <DatasetManager />
      </div>
    </main>
  );
}
