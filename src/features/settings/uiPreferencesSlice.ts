import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SearchField } from "@/features/search/types";

type UiDensity = "comfortable" | "compact";
type UiTheme = "light" | "dark" | "system";

type UiPreferencesState = {
  sidebarCollapsed: boolean;
  density: UiDensity;
  theme: UiTheme;
  defaultPageSize: 25 | 50 | 100;
  defaultColumns: string[];
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
  theme: "system",
  defaultPageSize: 25,
  defaultColumns: defaultVisibleColumns,
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
    themeSet(state, action: PayloadAction<UiTheme>) {
      state.theme = action.payload;
    },
    userPreferencesApplied(
      state,
      action: PayloadAction<{
        theme: UiTheme;
        defaultPageSize: 25 | 50 | 100;
        defaultColumns: string[];
      }>,
    ) {
      state.theme = action.payload.theme;
      state.defaultPageSize = action.payload.defaultPageSize;
      state.defaultColumns = [...action.payload.defaultColumns];
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
  themeSet,
  userPreferencesApplied,
  visibleColumnToggled,
  visibleColumnsSet,
  datasetVisibleColumnsSet,
} = uiPreferencesSlice.actions;
export type { UiDensity, UiTheme };
export default uiPreferencesSlice.reducer;
