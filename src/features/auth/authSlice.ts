import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppRole } from "@/lib/auth/roles";

type AuthState = {
  userId: string | null;
  role: AppRole | null;
  status: "unknown" | "authenticated" | "unauthenticated";
};

const initialState: AuthState = {
  userId: null,
  role: null,
  status: "unknown",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authUserUpdated(
      state,
      action: PayloadAction<{ userId: string; role: AppRole }>,
    ) {
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.status = "authenticated";
    },
    authCleared(state) {
      state.userId = null;
      state.role = null;
      state.status = "unauthenticated";
    },
  },
});

export const { authUserUpdated, authCleared } = authSlice.actions;
export default authSlice.reducer;
