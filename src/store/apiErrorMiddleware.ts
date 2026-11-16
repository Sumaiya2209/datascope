import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { toastAdded } from "./toastSlice";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getApiErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (!isRecord(error)) {
    return "The request failed. Please try again.";
  }

  if (isRecord(error.data)) {
    if (typeof error.data.error === "string") {
      return error.data.error;
    }

    if (typeof error.data.message === "string") {
      return error.data.message;
    }
  }

  if (typeof error.error === "string") {
    return error.error;
  }

  return "The request failed. Please try again.";
}

export const apiErrorToastMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    const result = next(action);

    if (isRejectedWithValue(action)) {
      dispatch(
        toastAdded({
          title: "Request failed",
          description: getApiErrorMessage(action.payload),
        }),
      );
    }

    return result;
  };
