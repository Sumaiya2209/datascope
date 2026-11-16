"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { toastDismissed, type ToastMessage } from "@/store/toastSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dispatch = useAppDispatch();
  const Icon =
    toast.tone === "success"
      ? CheckCircle2
      : toast.tone === "error"
        ? AlertCircle
        : Info;

  useEffect(() => {
    const timeout = window.setTimeout(
      () => dispatch(toastDismissed(toast.id)),
      6_000,
    );

    return () => window.clearTimeout(timeout);
  }, [dispatch, toast.id]);

  return (
    <li
      className="pointer-events-auto flex w-full max-w-[min(26rem,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-slate-950 shadow-[0_12px_36px_-12px_rgba(15,23,42,.35)]"
      role={toast.tone === "error" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={`mt-0.5 shrink-0 ${
          toast.tone === "success"
            ? "text-emerald-600"
            : toast.tone === "error"
              ? "text-red-600"
              : "text-slate-500"
        }`}
        size={17}
      />
      <div className="space-y-1">
        <p className="text-xs font-semibold">{toast.title}</p>
        <p className="text-[11px] leading-4 text-slate-600">
          {toast.description}
        </p>
      </div>
      <button
        aria-label="Dismiss notification"
        className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
        onClick={() => dispatch(toastDismissed(toast.id))}
        type="button"
      >
        <X aria-hidden="true" size={14} />
      </button>
    </li>
  );
}

export function ToastViewport() {
  const toasts = useAppSelector((state) => state.toasts);

  return (
    <ul
      aria-label="Notifications"
      className="pointer-events-none fixed right-3 bottom-3 z-[100] flex w-[calc(100vw-1.5rem)] flex-col gap-2 sm:right-5 sm:bottom-5 sm:w-auto"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ul>
  );
}
