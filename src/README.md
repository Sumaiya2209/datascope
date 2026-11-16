# Source structure

- `app/` contains App Router routes, layouts, and route-level composition.
- `features/` owns domain-specific code. Add each feature's UI, hooks, API
  clients, and types under `components/`, `hooks/`, `api/`, and `types/`.
- `features/search/components/filter-builder/` contains the search filter
  builder.
- `lib/` holds shared infrastructure: database access in `db/`, authentication
  helpers in `auth/`, and reusable utilities in `utils/`.
- Authentication configuration lives in the repository-root `auth.ts`;
  server-side role and dataset authorization helpers live in `lib/auth/`.
  Protect data reads and mutations with those helpers even when a route is
  already covered by `proxy.ts`.
- `store/` contains the Redux store and global client-state setup. Keep server
  data in RTK Query rather than copying records into Redux slices. The `auth`,
  `dataset`, `searchConfig`, `savedViews`, and `uiPreferences` slices hold
  session identity, selection, draft/applied filters, view-dialog state, and
  display preferences. `lib/api/dataApi.ts` owns RTK Query endpoints;
  analytics polling is enabled through `useGetAnalyticsQuery()`.
- `components/ui/` is for shadcn/ui primitives; `components/layout/` is for
  application-wide layout components.
- `types/` is for types shared across features. Keep feature-specific types in
  that feature's `types/` folder.

Prefer feature-local code; promote it to `lib/`, `components/`, or `types/` only
when it is genuinely shared.
