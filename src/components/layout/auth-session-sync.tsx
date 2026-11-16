"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { isAppRole } from "@/lib/auth/roles";
import { authCleared, authUserUpdated } from "@/features/auth/authSlice";
import { useAppDispatch } from "@/store/hooks";

export function AuthSessionSync() {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (
      status === "authenticated" &&
      session.user.id &&
      isAppRole(session.user.role)
    ) {
      dispatch(
        authUserUpdated({
          userId: session.user.id,
          role: session.user.role,
        }),
      );
      return;
    }

    if (status === "unauthenticated" || status === "authenticated") {
      dispatch(authCleared());
    }
  }, [dispatch, session?.user.id, session?.user.role, status]);

  return null;
}
