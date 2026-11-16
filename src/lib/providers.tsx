"use client";

import { useEffect, useState, type ReactNode } from "react";
import { setupListeners } from "@reduxjs/toolkit/query";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { AuthSessionSync } from "@/components/layout/auth-session-sync";
import { ToastViewport } from "@/components/layout/toast-viewport";
import { makeStore } from "@/store";

export function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);

  useEffect(() => setupListeners(store.dispatch), [store]);

  return (
    <SessionProvider>
      <Provider store={store}>
        <AuthSessionSync />
        {children}
        <ToastViewport />
      </Provider>
    </SessionProvider>
  );
}
