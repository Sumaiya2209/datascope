import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type SavedViewsUiState = {
  selectedViewId: string | null;
  editingViewId: string | null;
  isSaveDialogOpen: boolean;
};

const initialState: SavedViewsUiState = {
  selectedViewId: null,
  editingViewId: null,
  isSaveDialogOpen: false,
};

const savedViewsSlice = createSlice({
  name: "savedViews",
  initialState,
  reducers: {
    savedViewSelected(state, action: PayloadAction<string | null>) {
      state.selectedViewId = action.payload;
    },
    savedViewEditingStarted(state, action: PayloadAction<string | null>) {
      state.editingViewId = action.payload;
      state.isSaveDialogOpen = true;
    },
    saveDialogClosed(state) {
      state.editingViewId = null;
      state.isSaveDialogOpen = false;
    },
  },
});

export const { savedViewSelected, savedViewEditingStarted, saveDialogClosed } =
  savedViewsSlice.actions;
export default savedViewsSlice.reducer;
