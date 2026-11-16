import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type DatasetState = {
  selectedDatasetId: string | null;
};

const initialState: DatasetState = {
  selectedDatasetId: null,
};

const datasetSlice = createSlice({
  name: "dataset",
  initialState,
  reducers: {
    datasetSelected(state, action: PayloadAction<string | null>) {
      state.selectedDatasetId = action.payload;
    },
    datasetSelectionCleared(state) {
      state.selectedDatasetId = null;
    },
  },
});

export const { datasetSelected, datasetSelectionCleared } =
  datasetSlice.actions;
export default datasetSlice.reducer;
