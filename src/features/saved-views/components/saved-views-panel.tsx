"use client";

import { useState, type FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";
import {
  useCreateSavedViewMutation,
  useDeleteSavedViewMutation,
  useGetSavedViewsQuery,
  useGetSearchHistoryQuery,
  useUpdateSavedViewMutation,
} from "@/lib/api/dataApi";
import type {
  SavedView,
  SavedViewConfiguration,
  SearchHistoryEntry,
} from "@/lib/api/types";
import type { SearchDraft } from "@/features/search/searchConfigSlice";
import { savedViewSelected } from "../savedViewsSlice";

type Props = {
  datasetId: string;
  draft: SearchDraft;
  visibleColumns: string[];
  onApply: (datasetId: string, configuration: SavedViewConfiguration) => void;
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
  return "The request could not be completed.";
}

function formatConfiguration(
  draft: SearchDraft,
  visibleColumns: string[],
): SavedViewConfiguration {
  return {
    ...draft,
    conditions: draft.conditions.map((condition) => ({
      ...condition,
      value: Array.isArray(condition.value)
        ? [...condition.value]
        : condition.value,
    })),
    sort: draft.sort.map((sort) => ({ ...sort })),
    visibleColumns: [...visibleColumns],
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function SavedViewsPanel({
  datasetId,
  draft,
  visibleColumns,
  onApply,
}: Props) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.userId);
  const selectedViewId = useAppSelector(
    (state) => state.savedViews.selectedViewId,
  );
  const {
    data: savedViewsResult,
    error: savedViewsError,
    isError: savedViewsIsError,
    isLoading: savedViewsIsLoading,
  } = useGetSavedViewsQuery({ datasetId });
  const {
    data: historyResult,
    error: historyError,
    isError: historyIsError,
    isLoading: historyIsLoading,
  } = useGetSearchHistoryQuery({ limit: 50 });
  const [createSavedView, createState] = useCreateSavedViewMutation();
  const [updateSavedView, updateState] = useUpdateSavedViewMutation();
  const [deleteSavedView, deleteState] = useDeleteSavedViewMutation();
  const [formView, setFormView] = useState<SavedView | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createState.isLoading || updateState.isLoading;
  const views = savedViewsResult?.views ?? [];
  const history =
    historyResult?.history.filter((entry) => entry.datasetId === datasetId) ??
    [];

  function openCreateForm() {
    setFormView(null);
    setName("");
    setDescription("");
    setIsShared(false);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(view: SavedView) {
    setFormView(view);
    setName(view.name);
    setDescription(view.description ?? "");
    setIsShared(view.isShared);
    setFormError(null);
    setIsFormOpen(true);
  }

  async function submitView(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      if (formView) {
        await updateSavedView({
          datasetId,
          viewId: formView.id,
          changes: {
            name,
            description,
            isShared,
          },
        }).unwrap();
        dispatch(
          toastAdded({
            title: "Saved view updated",
            description: `"${name.trim()}" was updated.`,
          }),
        );
      } else {
        const result = await createSavedView({
          datasetId,
          name,
          description,
          isShared,
          configuration: formatConfiguration(draft, visibleColumns),
        }).unwrap();
        dispatch(savedViewSelected(result.view.id));
        dispatch(
          toastAdded({
            title: "View saved",
            description: `"${result.view.name}" is ready to apply.`,
          }),
        );
      }

      setIsFormOpen(false);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  async function removeView(view: SavedView) {
    if (!window.confirm(`Delete the saved view "${view.name}"?`)) {
      return;
    }

    try {
      await deleteSavedView({ datasetId, viewId: view.id }).unwrap();
      if (selectedViewId === view.id) {
        dispatch(savedViewSelected(null));
      }
      dispatch(
        toastAdded({
          title: "Saved view deleted",
          description: `"${view.name}" was deleted.`,
        }),
      );
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  async function updateViewConfiguration(view: SavedView) {
    try {
      await updateSavedView({
        datasetId,
        viewId: view.id,
        changes: {
          configuration: formatConfiguration(draft, visibleColumns),
        },
      }).unwrap();
      dispatch(
        toastAdded({
          title: "View configuration updated",
          description: `"${view.name}" now uses the current filters and columns.`,
        }),
      );
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  function applyView(view: SavedView) {
    dispatch(savedViewSelected(view.id));
    onApply(view.datasetId, view.configuration);
  }

  function applyHistory(entry: SearchHistoryEntry) {
    dispatch(savedViewSelected(null));
    onApply(entry.datasetId, entry.query);
  }

  return (
    <section
      aria-label="Saved views and search history"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Saved views</h2>
          <p className="mt-1 text-xs text-slate-500">
            Shared views are visible to members who have permission to access
            this dataset.
          </p>
        </div>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          disabled={isSaving}
          onClick={openCreateForm}
          type="button"
        >
          Save current view
        </button>
      </div>

      {isFormOpen && (
        <form
          className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
          onSubmit={submitView}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            View name
            <input
              autoFocus
              className="h-10 rounded-md border border-slate-300 bg-white px-3 font-normal"
              maxLength={200}
              onChange={(event) => setName(event.currentTarget.value)}
              required
              value={name}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Description
            <input
              className="h-10 rounded-md border border-slate-300 bg-white px-3 font-normal"
              maxLength={1000}
              onChange={(event) => setDescription(event.currentTarget.value)}
              value={description}
            />
          </label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input
              checked={isShared}
              className="mt-0.5 size-4 accent-slate-900"
              onChange={(event) => setIsShared(event.currentTarget.checked)}
              type="checkbox"
            />
            <span>
              Share with dataset members
              <span className="mt-0.5 block text-xs text-slate-500">
                Only members with dataset view permission can access this view.
              </span>
            </span>
          </label>
          {formError && (
            <p className="text-sm text-red-700 sm:col-span-2" role="alert">
              {formError}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              disabled={isSaving || name.trim().length === 0}
              type="submit"
            >
              {isSaving
                ? "Saving..."
                : formView
                  ? "Save changes"
                  : "Create view"}
            </button>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-white"
              onClick={() => setIsFormOpen(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {savedViewsIsError && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {getErrorMessage(savedViewsError)}
        </p>
      )}
      {formError && !isFormOpen && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {formError}
        </p>
      )}
      {savedViewsIsLoading ? (
        <p className="py-4 text-sm text-slate-500">Loading saved views...</p>
      ) : views.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">
          No saved views for this dataset yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {views.map((view) => {
            const isOwner = view.ownerId === userId;
            return (
              <li
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={view.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {view.name}
                    {view.isShared && (
                      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Shared
                      </span>
                    )}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {view.description || `By ${view.ownerName}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                    onClick={() => applyView(view)}
                    type="button"
                  >
                    Apply
                  </button>
                  {isOwner && (
                    <>
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                        onClick={() => openEditForm(view)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                        onClick={() => void updateViewConfiguration(view)}
                        type="button"
                      >
                        Update filters
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        disabled={deleteState.isLoading}
                        onClick={() => void removeView(view)}
                        type="button"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="font-semibold">Recent searches</h3>
        {historyIsError && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {getErrorMessage(historyError)}
          </p>
        )}
        {historyIsLoading ? (
          <p className="py-3 text-sm text-slate-500">
            Loading recent searches...
          </p>
        ) : history.length === 0 ? (
          <p className="py-3 text-sm text-slate-500">
            Searches you run will appear here.
          </p>
        ) : (
          <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-auto">
            {history.map((entry) => (
              <li
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={entry.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {entry.query.search ||
                      `${entry.query.conditions.length} filter${entry.query.conditions.length === 1 ? "" : "s"}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(entry.executedAt)} ·{" "}
                    {entry.resultCount.toLocaleString()} matching records ·{" "}
                    {entry.durationMs} ms
                  </p>
                </div>
                <button
                  className="self-start rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 sm:self-auto"
                  onClick={() => applyHistory(entry)}
                  type="button"
                >
                  Reapply
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
