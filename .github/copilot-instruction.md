You are helping me build DataScope, an enterprise data discovery platform. Full requirements are in docs/PROJECT_SPEC.md; read it when needed.

Rules:
- Stack: Next.js App Router, TypeScript (strict), Redux Toolkit + RTK Query, PostgreSQL, Drizzle ORM, Zod, Recharts, Tailwind, shadcn/ui.
- Feature-based folder structure: src/features/<name>/{components,hooks,api,types}.
- Never load full datasets into the frontend. All search, filter, sort, pagination, and aggregation happen on the server in SQL.
- Filter/sort/page state lives in the URL. Redux holds only global client state. RTK Query holds server state.
- Validate every API input with Zod. Enforce RBAC and dataset-level permissions on the server in every route.
- Write small, typed, reusable code. No `any`. Add brief comments only for non-obvious decisions.
- After each task, tell me which files you changed and how to test it.
- Keep a running list of technical decisions in docs/decisions/ (Problem, Alternatives, Selected, Reason, Pros, Cons, Performance, Future limits).