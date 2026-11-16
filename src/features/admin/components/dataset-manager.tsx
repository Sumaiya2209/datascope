"use client";

import { useState, type FormEvent } from "react";
import {
  useCreateAdminDatasetMutation,
  useDeleteAdminDatasetMutation,
  useGetAdminDatasetsQuery,
  useUpdateAdminDatasetMutation,
} from "@/lib/api/dataApi";
import type { AdminDataset } from "@/lib/api/types";
import { useAppDispatch } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";

type DatasetFormValues = {
  name: string;
  description: string;
  category: string;
  dataSource: string;
  analyst: "" | "view" | "edit";
  viewer: "" | "view";
};

const EMPTY_FORM: DatasetFormValues = {
  name: "",
  description: "",
  category: "",
  dataSource: "",
  analyst: "",
  viewer: "",
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

function valuesFromDataset(dataset: AdminDataset): DatasetFormValues {
  return {
    name: dataset.name,
    description: dataset.description ?? "",
    category: dataset.category ?? "",
    dataSource: dataset.dataSource ?? "",
    analyst:
      dataset.permissions.analyst === "view" ||
      dataset.permissions.analyst === "edit"
        ? dataset.permissions.analyst
        : "",
    viewer: dataset.permissions.viewer === "view" ? "view" : "",
  };
}

export function DatasetManager() {
  const dispatch = useAppDispatch();
  const { data, error, isError, isLoading } = useGetAdminDatasetsQuery();
  const [createDataset, createState] = useCreateAdminDatasetMutation();
  const [updateDataset, updateState] = useUpdateAdminDatasetMutation();
  const [deleteDataset, deleteState] = useDeleteAdminDatasetMutation();
  const [editing, setEditing] = useState<AdminDataset | null>(null);
  const [values, setValues] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createState.isLoading || updateState.isLoading;

  function startCreate() {
    setEditing(null);
    setValues(EMPTY_FORM);
    setFormError(null);
  }

  function startEdit(dataset: AdminDataset) {
    setEditing(dataset);
    setValues(valuesFromDataset(dataset));
    setFormError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      category: values.category.trim() || null,
      dataSource: values.dataSource.trim() || null,
      permissions: {
        analyst: values.analyst || null,
        viewer: values.viewer || null,
      },
    };

    try {
      if (editing) {
        await updateDataset({
          datasetId: editing.id,
          changes: payload,
        }).unwrap();
        dispatch(
          toastAdded({
            title: "Dataset updated",
            description: `${payload.name} was updated.`,
          }),
        );
      } else {
        await createDataset(payload).unwrap();
        dispatch(
          toastAdded({
            title: "Dataset created",
            description: `${payload.name} is ready to configure.`,
          }),
        );
      }
      setEditing(null);
      setValues(EMPTY_FORM);
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    }
  }

  async function remove(dataset: AdminDataset) {
    if (
      !window.confirm(
        `Delete "${dataset.name}" and all its records, saved views, and permissions? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteDataset({ datasetId: dataset.id }).unwrap();
      dispatch(
        toastAdded({
          title: "Dataset deleted",
          description: `${dataset.name} and its related data were deleted.`,
        }),
      );
      if (editing?.id === dataset.id) {
        setEditing(null);
      }
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              {editing ? `Edit ${editing.name}` : "Create dataset"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure metadata and role-based dataset access.
            </p>
          </div>
          {editing && (
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              onClick={startCreate}
              type="button"
            >
              Cancel editing
            </button>
          )}
        </div>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Name
            <input
              className="h-10 rounded-md border border-slate-300 px-3 font-normal"
              maxLength={200}
              onChange={(event) =>
                setValues({ ...values, name: event.currentTarget.value })
              }
              required
              value={values.name}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Category
            <input
              className="h-10 rounded-md border border-slate-300 px-3 font-normal"
              maxLength={100}
              onChange={(event) =>
                setValues({ ...values, category: event.currentTarget.value })
              }
              value={values.category}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Description
            <textarea
              className="min-h-20 rounded-md border border-slate-300 px-3 py-2 font-normal"
              maxLength={5000}
              onChange={(event) =>
                setValues({ ...values, description: event.currentTarget.value })
              }
              value={values.description}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Data source
            <input
              className="h-10 rounded-md border border-slate-300 px-3 font-normal"
              maxLength={200}
              onChange={(event) =>
                setValues({ ...values, dataSource: event.currentTarget.value })
              }
              value={values.dataSource}
            />
          </label>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-medium">
              Role permissions
            </legend>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Analysts
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-2 text-slate-900"
                onChange={(event) =>
                  setValues({
                    ...values,
                    analyst: event.currentTarget
                      .value as DatasetFormValues["analyst"],
                  })
                }
                value={values.analyst}
              >
                <option value="">No access</option>
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Viewers
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-2 text-slate-900"
                onChange={(event) =>
                  setValues({
                    ...values,
                    viewer: event.currentTarget
                      .value as DatasetFormValues["viewer"],
                  })
                }
                value={values.viewer}
              >
                <option value="">No access</option>
                <option value="view">View</option>
              </select>
            </label>
          </fieldset>
          {formError && (
            <p className="text-sm text-red-700 sm:col-span-2" role="alert">
              {formError}
            </p>
          )}
          <div className="sm:col-span-2">
            <button
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              disabled={isSaving || values.name.trim().length === 0}
              type="submit"
            >
              {isSaving
                ? "Saving..."
                : editing
                  ? "Save dataset"
                  : "Create dataset"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <h2 className="font-semibold">Datasets</h2>
            <p className="mt-1 text-xs text-slate-500">
              {data?.datasets.length ?? 0} configured
            </p>
          </div>
          {editing && (
            <button
              className="text-sm font-medium text-slate-600 underline"
              onClick={startCreate}
              type="button"
            >
              New dataset
            </button>
          )}
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-slate-500">Loading datasets...</p>
        ) : isError ? (
          <p className="p-5 text-sm text-red-700" role="alert">
            {getErrorMessage(error)}
          </p>
        ) : data?.datasets.length ? (
          <ul className="divide-y divide-slate-100">
            {data.datasets.map((dataset) => (
              <li
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                key={dataset.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{dataset.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[dataset.category, dataset.dataSource, dataset.slug]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · {dataset.recordCount.toLocaleString()} records
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Analyst: {dataset.permissions.analyst ?? "No access"} ·
                    Viewer: {dataset.permissions.viewer ?? "No access"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                    onClick={() => startEdit(dataset)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={deleteState.isLoading}
                    onClick={() => void remove(dataset)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-slate-500">
            No datasets have been created yet.
          </p>
        )}
      </section>
    </div>
  );
}
