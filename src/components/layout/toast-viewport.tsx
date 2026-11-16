"use client";

import { useEffect } from "react";
import { toastDismissed, type ToastMessage } from "@/store/toastSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timeout = window.setTimeout(
      () => dispatch(toastDismissed(toast.id)),
      6_000,
    );

    return () => window.clearTimeout(timeout);
  }, [dispatch, toast.id]);

  return (
    <li
      className="bg-card text-card-foreground flex min-w-72 items-start justify-between gap-4 rounded-lg border p-4 shadow-lg"
      role="alert"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="text-muted-foreground text-sm">{toast.description}</p>
      </div>
      <button
        aria-label="Dismiss notification"
        className="text-muted-foreground text-xs underline"
        onClick={() => dispatch(toastDismissed(toast.id))}
        type="button"
      >
        Dismiss
      </button>
    </li>
  );
}

export function ToastViewport() {
  const toasts = useAppSelector((state) => state.toasts);

  return (
    <ul
      aria-label="Notifications"
      className="fixed right-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ul>
  );
}
