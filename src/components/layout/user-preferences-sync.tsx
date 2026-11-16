"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useGetUserPreferencesQuery } from "@/lib/api/dataApi";
import { userPreferencesApplied } from "@/features/settings/uiPreferencesSlice";
import { useAppDispatch } from "@/store/hooks";

export function UserPreferencesSync() {
  const { status } = useSession();
  const dispatch = useAppDispatch();
  const { data } = useGetUserPreferencesQuery(undefined, {
    skip: status !== "authenticated",
  });

  useEffect(() => {
    if (!data?.preferences) {
      return;
    }

    dispatch(userPreferencesApplied(data.preferences));

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const isDark =
      data.preferences.theme === "dark" ||
      (data.preferences.theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [data?.preferences, dispatch]);

  useEffect(() => {
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (data?.preferences.theme === "system") {
        document.documentElement.classList.toggle("dark", event.matches);
        document.documentElement.style.colorScheme = event.matches
          ? "dark"
          : "light";
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [data?.preferences.theme]);

  return null;
}
