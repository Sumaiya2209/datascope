"use client";

import { useState, type FormEvent } from "react";
import { useUpdateUserPreferencesMutation } from "@/lib/api/dataApi";
import type { UserPreferences } from "@/lib/api/types";
import { useAppDispatch } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";
import { userPreferencesApplied } from "../uiPreferencesSlice";

const defaultColumns = [
  { field: "status", label: "Status" },
  { field: "country", label: "Country" },
  { field: "category", label: "Category" },
  { field: "revenue", label: "Revenue" },
  { field: "created_at", label: "Created date" },
  { field: "name", label: "Name" },
  { field: "email", label: "Email" },
];

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
  return "Your settings could not be saved.";
}

function applyTheme(theme: UserPreferences["theme"]) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function UserSettingsForm({
  preferences,
}: {
  preferences: UserPreferences;
}) {
  const dispatch = useAppDispatch();
  const [updatePreferences, { isLoading }] = useUpdateUserPreferencesMutation();
  const [theme, setTheme] = useState(preferences.theme);
  const [defaultPageSize, setDefaultPageSize] = useState<
    UserPreferences["defaultPageSize"]
  >(preferences.defaultPageSize);
  const [columns, setColumns] = useState(preferences.defaultColumns);
  const [error, setError] = useState<string | null>(null);

  function toggleColumn(field: string) {
    setColumns((current) =>
      current.includes(field)
        ? current.filter((value) => value !== field)
        : [...current, field],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const updated = {
      theme,
      defaultPageSize,
      defaultColumns: columns,
    };

    try {
      const response = await updatePreferences(updated).unwrap();
      dispatch(userPreferencesApplied(response.preferences));
      applyTheme(response.preferences.theme);
      dispatch(
        toastAdded({
          title: "Settings saved",
          description: "Your preferences will be used across DataScope.",
        }),
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  return (
    <form
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={submit}
    >
      <label className="flex max-w-md flex-col gap-1.5 text-sm font-medium">
        Theme
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 font-normal"
          onChange={(event) =>
            setTheme(event.currentTarget.value as UserPreferences["theme"])
          }
          value={theme}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label className="flex max-w-md flex-col gap-1.5 text-sm font-medium">
        Default page size
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 font-normal"
          onChange={(event) =>
            setDefaultPageSize(
              Number(
                event.currentTarget.value,
              ) as UserPreferences["defaultPageSize"],
            )
          }
          value={defaultPageSize}
        >
          {[25, 50, 100].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize} rows
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Default visible columns</legend>
        <p className="mt-1 text-xs text-slate-500">
          Applies when a dataset has no saved column visibility preference.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {defaultColumns.map(({ field, label }) => (
            <label
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
              key={field}
            >
              <input
                checked={columns.includes(field)}
                className="size-4 accent-slate-900"
                onChange={() => toggleColumn(field)}
                type="checkbox"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button
        className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
