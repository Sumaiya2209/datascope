import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SearchField } from "@/features/search/types";

type UiDensity = "comfortable" | "compact";

type UiPreferencesState = {
  sidebarCollapsed: boolean;
  density: UiDensity;
  visibleColumns: SearchField[];
  visibleColumnsByDataset: Record<string, string[]>;
};

const defaultVisibleColumns: SearchField[] = [
  "status",
  "country",
  "category",
  "revenue",
  "created_at",
  "name",
  "email",
];

const initialState: UiPreferencesState = {
  sidebarCollapsed: false,
  density: "comfortable",
  visibleColumns: defaultVisibleColumns,
  visibleColumnsByDataset: {},
};

const uiPreferencesSlice = createSlice({
  name: "uiPreferences",
  initialState,
  reducers: {
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    sidebarCollapseSet(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    densitySet(state, action: PayloadAction<UiDensity>) {
      state.density = action.payload;
    },
    visibleColumnToggled(state, action: PayloadAction<SearchField>) {
      const index = state.visibleColumns.indexOf(action.payload);
      if (index === -1) {
        state.visibleColumns.push(action.payload);
      } else {
        state.visibleColumns.splice(index, 1);
      }
    },
    visibleColumnsSet(state, action: PayloadAction<SearchField[]>) {
      state.visibleColumns = [...new Set(action.payload)];
    },
    datasetVisibleColumnsSet(
      state,
      action: PayloadAction<{ datasetId: string; columns: string[] }>,
    ) {
      state.visibleColumnsByDataset[action.payload.datasetId] = [
        ...new Set(action.payload.columns),
      ];
    },
  },
});

export const {
  sidebarToggled,
  sidebarCollapseSet,
  densitySet,
  visibleColumnToggled,
  visibleColumnsSet,
  datasetVisibleColumnsSet,
} = uiPreferencesSlice.actions;
export type { UiDensity };
export default uiPreferencesSlice.reducer;
