import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

type ToastMessage = {
  id: string;
  title: string;
  description: string;
};

const MAX_TOASTS = 4;

const toastSlice = createSlice({
  name: "toasts",
  initialState: [] as ToastMessage[],
  reducers: {
    toastAdded: {
      reducer(state, action: PayloadAction<ToastMessage>) {
        state.push(action.payload);
        if (state.length > MAX_TOASTS) {
          state.shift();
        }
      },
      prepare(message: Omit<ToastMessage, "id">) {
        return { payload: { ...message, id: nanoid() } };
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      return state.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { toastAdded, toastDismissed } = toastSlice.actions;
export type { ToastMessage };
export default toastSlice.reducer;
