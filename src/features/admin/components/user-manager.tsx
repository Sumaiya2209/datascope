"use client";

import { useState } from "react";
import {
  useGetAdminUsersQuery,
  useUpdateAdminUserRoleMutation,
} from "@/lib/api/dataApi";
import type { AdminUser } from "@/lib/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";

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

export function UserManager() {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { data, error, isError, isLoading } = useGetAdminUsersQuery();
  const [updateRole, { isLoading: isSaving }] =
    useUpdateAdminUserRoleMutation();
  const [requestError, setRequestError] = useState<string | null>(null);

  async function changeRole(user: AdminUser, role: AdminUser["role"]) {
    if (role === user.role) {
      return;
    }
    setRequestError(null);
    try {
      await updateRole({ userId: user.id, role }).unwrap();
      dispatch(
        toastAdded({
          title: "User role updated",
          description: `${user.name} is now ${role}.`,
        }),
      );
    } catch (updateError) {
      setRequestError(getErrorMessage(updateError));
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="font-semibold">Users</h2>
        <p className="mt-1 text-xs text-slate-500">
          Assign administrator, analyst, and viewer roles. Your own role is
          locked to prevent accidental lockout.
        </p>
      </div>
      {requestError && (
        <p
          className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {requestError}
        </p>
      )}
      {isLoading ? (
        <p className="p-5 text-sm text-slate-500">Loading users...</p>
      ) : isError ? (
        <p className="p-5 text-sm text-red-700" role="alert">
          {getErrorMessage(error)}
        </p>
      ) : data?.users.length ? (
        <ul className="divide-y divide-slate-100">
          {data.users.map((user) => (
            <li
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              key={user.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Role
                <select
                  aria-label={`Role for ${user.name}`}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-slate-900"
                  disabled={isSaving || user.id === currentUserId}
                  onChange={(event) =>
                    void changeRole(
                      user,
                      event.currentTarget.value as AdminUser["role"],
                    )
                  }
                  value={user.role}
                >
                  <option value="admin">Administrator</option>
                  <option value="analyst">Analyst</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-8 text-center text-sm text-slate-500">
          No users are registered.
        </p>
      )}
    </section>
  );
}
