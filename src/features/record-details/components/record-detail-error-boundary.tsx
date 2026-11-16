"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClose: () => void;
};

type State = {
  hasError: boolean;
};

export class RecordDetailErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Record detail drawer failed to render.", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          aria-label="Record details"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
          role="presentation"
        >
          <section
            aria-labelledby="record-detail-error-title"
            aria-modal="true"
            className="flex h-full w-full max-w-xl flex-col bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <h2
              className="text-lg font-semibold"
              id="record-detail-error-title"
            >
              Record details unavailable
            </h2>
            <p className="mt-2 text-sm text-slate-600" role="alert">
              Something went wrong while displaying this record.
            </p>
            <button
              className="mt-6 self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              onClick={this.props.onClose}
              type="button"
            >
              Close
            </button>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
