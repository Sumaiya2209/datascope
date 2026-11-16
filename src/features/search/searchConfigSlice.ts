import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SearchRequest } from "./types";

type SearchDraft = Pick<
  SearchRequest,
  "search" | "conditions" | "sort" | "page" | "pageSize"
>;

type SearchConfigState = {
  draft: SearchDraft;
  applied: SearchDraft | null;
};

function copySearchDraft(draft: SearchDraft): SearchDraft {
  return {
    ...draft,
    conditions: draft.conditions.map((condition) => ({
      ...condition,
      value: Array.isArray(condition.value)
        ? [...condition.value]
        : condition.value,
    })),
    sort: draft.sort.map((sort) => ({ ...sort })),
  };
}

const initialDraft: SearchDraft = {
  search: "",
  conditions: [],
  sort: [],
  page: 1,
  pageSize: 25,
};

const initialState: SearchConfigState = {
  draft: initialDraft,
  applied: null,
};

const searchConfigSlice = createSlice({
  name: "searchConfig",
  initialState,
  reducers: {
    draftUpdated(state, action: PayloadAction<Partial<SearchDraft>>) {
      state.draft = { ...state.draft, ...action.payload };
      if (action.payload.page === undefined) {
        state.draft.page = 1;
      }
    },
    draftReset(state) {
      state.draft = initialDraft;
      state.applied = null;
    },
    searchDraftApplied(state) {
      state.applied = copySearchDraft(state.draft);
    },
    searchConfigRestored(
      state,
      action: PayloadAction<{ draft: SearchDraft; apply: boolean }>,
    ) {
      state.draft = copySearchDraft(action.payload.draft);
      state.applied = action.payload.apply
        ? copySearchDraft(action.payload.draft)
        : null;
    },
    appliedSearchCleared(state) {
      state.applied = null;
    },
  },
});

export const {
  draftUpdated,
  draftReset,
  searchDraftApplied,
  searchConfigRestored,
  appliedSearchCleared,
} = searchConfigSlice.actions;
export type { SearchDraft };
export default searchConfigSlice.reducer;
