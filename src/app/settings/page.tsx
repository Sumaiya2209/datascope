"use client";

import Link from "next/link";
import { useGetUserPreferencesQuery } from "@/lib/api/dataApi";
import { UserSettingsForm } from "@/features/settings/components/user-settings-form";

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
  return "User settings could not be loaded.";
}

export default function SettingsPage() {
  const { data, error, isError, isLoading } = useGetUserPreferencesQuery();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-slate-500 uppercase">
              DataScope
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              User settings
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Personalize the Explorer defaults for your account.
            </p>
          </div>
          <Link
            className="text-sm font-medium text-slate-700 underline"
            href="/explorer"
          >
            Back to Explorer
          </Link>
        </header>
        {isLoading && (
          <div
            aria-label="Loading preferences"
            aria-busy="true"
            className="h-96 animate-pulse rounded-xl bg-slate-200"
          />
        )}
        {isError && (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {getErrorMessage(error)}
          </p>
        )}
        {data && <UserSettingsForm preferences={data.preferences} />}
      </div>
    </main>
  );
}
