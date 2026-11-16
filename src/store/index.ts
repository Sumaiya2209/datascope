import { configureStore } from "@reduxjs/toolkit";
import { dataApi } from "@/lib/api/dataApi";
import authReducer from "@/features/auth/authSlice";
import datasetReducer from "@/features/datasets/datasetSlice";
import savedViewsReducer from "@/features/saved-views/savedViewsSlice";
import searchConfigReducer from "@/features/search/searchConfigSlice";
import uiPreferencesReducer from "@/features/settings/uiPreferencesSlice";
import { apiErrorToastMiddleware } from "./apiErrorMiddleware";
import toastReducer from "./toastSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      dataset: datasetReducer,
      searchConfig: searchConfigReducer,
      savedViews: savedViewsReducer,
      uiPreferences: uiPreferencesReducer,
      toasts: toastReducer,
      [dataApi.reducerPath]: dataApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        dataApi.middleware,
        apiErrorToastMiddleware,
      ),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
