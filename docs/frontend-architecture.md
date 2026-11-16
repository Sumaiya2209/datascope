# Frontend architecture

The UI is divided by product feature. App Router files define navigation and
route boundaries; feature modules own domain components and server helpers;
shared libraries provide the API, authentication, and database infrastructure.

```mermaid
flowchart TB
  Browser[Browser]
  subgraph NextApp["Next.js App Router"]
    Layout[Root layout and providers]
    Routes[Pages and route segments]
    Shell[Responsive application shell]
  end
  subgraph Features["Feature modules"]
    Auth[Auth]
    Datasets[Datasets and admin]
    Explorer[Data Explorer]
    Search[Search and filter builder]
    Views[Saved views and history]
    Details[Record details]
    Analytics[Analytics]
    Settings[Settings]
  end
  subgraph SharedUI["Shared UI"]
    LayoutComponents[Layout components]
    UIComponents[UI primitives]
    Table[Reusable table and virtual rows]
  end
  subgraph State["Client state"]
    Slices[Redux slices: auth, dataset, draft search, view UI, preferences]
    RTK[RTK Query API cache]
    URL[URL query state]
    Local[Temporary component state]
  end
  subgraph Server["Next.js server"]
    Handlers[REST route handlers]
    Authz[Auth.js session and authorization]
    Zod[Zod request validation]
    Drizzle[Drizzle query and aggregation layer]
  end
  PostgreSQL[(PostgreSQL)]

  Browser --> Layout
  Layout --> Routes
  Routes --> Shell
  Shell --> Features
  Features --> SharedUI
  Features <--> Slices
  Features <--> RTK
  Explorer <--> URL
  Features <--> Local
  RTK -->|same-origin JSON| Handlers
  Handlers --> Authz
  Handlers --> Zod
  Authz --> Drizzle
  Zod --> Drizzle
  Drizzle --> PostgreSQL
```

## Extension boundaries

- Add a route or page composition in `src/app`.
- Put domain UI and feature-specific server code in `src/features/<feature>`.
- Put shared presentation primitives in `src/components/ui` and application
  navigation/layout components in `src/components/layout`.
- Add shared API endpoints and response types in `src/lib/api`.
- Keep shared Drizzle schema/client code in `src/lib/db`; authorization helpers
  belong in `src/lib/auth`.
- Add global client state only when multiple features need it. Keep remote data
  in RTK Query, and do not copy record pages into a normal Redux slice.

This keeps feature additions cohesive while preserving a single API boundary
for authentication, validation, and database access.
