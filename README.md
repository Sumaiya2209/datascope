# DataScope

## Project overview

DataScope is an enterprise-style data discovery and intelligence application
for searching, filtering, analyzing, and administering large business datasets.
It keeps record retrieval and aggregation in PostgreSQL and exposes only
validated, authorized pages of data to the browser.

| Submission item              | Status                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Live deployment              | Not deployed; no production URL is configured                                                        |
| GitHub repository            | [Sumaiya2209/datascope](https://github.com/Sumaiya2209/datascope)                                    |
| Performance measurements     | Pending a run against the dedicated `_perf` database; see [the report](./docs/performance-report.md) |
| Technical presentation video | Not included in this repository                                                                      |

## Features

- Credentials registration and login with role-bearing JWT sessions; server
  routes enforce role and dataset-level permissions.
- Dataset library and administrator tools for dataset metadata, role grants,
  user roles, and user preferences.
- Data Explorer with dynamic dataset fields, global search, typed filter rows,
  multiple server-side sorts, column visibility/resizing, row selection,
  pagination, search highlighting, and a record-detail drawer.
- Saved views can preserve search, conditions, sort, page, page size, visible
  columns, and team-sharing visibility. Applying a view restores the Explorer
  configuration and URL. Search history is retained per user (up to 50).
- Record details load separately from the table; relationships and change
  history are fetched lazily.
- Analytics are calculated by PostgreSQL aggregations and displayed with
  Recharts; raw records are not sent to the browser to calculate statistics.
- Public landing, login, and registration pages lead into the overview
  dashboard and responsive application workspace.
- Responsive application shell, loading skeletons, empty/error states, and
  toast notifications.
- Faker-based demo seeding (100,000 by default, configurable through 1,000,000)
  and an isolated performance benchmark.

CSV/background exports and natural-language AI search are not currently
implemented.

## Technology stack

| Area                   | Technology                                              |
| ---------------------- | ------------------------------------------------------- |
| Web application        | Next.js App Router, React, TypeScript, Node.js          |
| UI                     | Tailwind CSS, shadcn/ui-style components, Lucide        |
| Client state           | Redux Toolkit and React Redux                           |
| Server/API cache       | RTK Query                                               |
| API validation         | Zod, Next.js route handlers                             |
| Authentication         | Auth.js / NextAuth Credentials, bcrypt                  |
| Database               | PostgreSQL 16, Drizzle ORM and drizzle-kit, postgres.js |
| Data table             | TanStack Table and TanStack Virtual                     |
| Charts                 | Recharts                                                |
| Test and quality tools | Vitest, Playwright, ESLint, Prettier                    |
| Generated data         | `@faker-js/faker`                                       |

## Local development

Requirements: Node.js 22 or newer, npm, and Docker Desktop (or a compatible
Docker Engine).

Run these commands from the repository directory:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm install
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
docker compose up -d --wait postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Set `AUTH_SECRET` to the generated value in `.env.local`. Set both database
URLs there to the intended database; for local Docker, use the Compose
PostgreSQL connection. Open [http://localhost:3000](http://localhost:3000).

`npm run db:seed` creates three role/user fixtures, two datasets, access grants,
and 100,000 records by default. Change the count with
`npm run db:seed -- 250000` (valid range: 1–1,000,000). Seeded users have no
password hashes; register a user to sign in as a Viewer. Assign elevated roles
only through a controlled administrative workflow.

## Neon database connection

The repository is linked to the Neon `production` branch. Neon variables are
stored in the ignored `.env.local`; they are not checked in or printed by the
application. Pull them with:

```powershell
neon env pull --file .env.local --service postgres
```

Next.js uses the pooled `DATABASE_URL` for application queries through the
existing Drizzle/postgres.js client. Drizzle Kit and the seed script load only
`.env.local`; both prefer `DATABASE_URL_UNPOOLED` and fall back to
`DATABASE_URL`. Remove stale database URL entries from higher-precedence
Next.js development env files so the app also uses the intended pooled URL.

## Frontend architecture

The application uses a feature-based structure so domain UI, API behavior, and
server logic stay together:

```text
src/
  app/                 App Router pages, layouts, and API route handlers
  components/
    layout/            Application shell and shared navigation
    ui/                Reusable design-system primitives
  features/
    admin/ auth/ datasets/ explorer/ overview/
    record-details/ saved-views/ search/ analytics/ settings/
  lib/
    api/               RTK Query API and response types
    auth/              Authentication, roles, and authorization helpers
    db/                Drizzle client and schema
    utils/             Shared utilities
  store/               Redux store, hooks, and API error middleware
  types/               Shared application types
```

Pages compose feature components; features own domain-specific UI and
server-side helpers; `lib` contains shared infrastructure. Add a new domain
feature under `src/features/<feature>` and expose a route through `src/app`.
Reusable presentation primitives belong in `src/components/ui`; cross-feature
API cache definitions belong in `src/lib/api`.

See [the frontend architecture diagram](./docs/frontend-architecture.md) and
[the database ER diagram](./docs/er-diagram.md).

## Data-fetching strategy

The browser uses RTK Query hooks to call same-origin `/api` endpoints. Next.js
route handlers validate request data and enforce Auth.js role/dataset access
before using Drizzle to run parameterized PostgreSQL queries.
This keeps authorization and filtering on the server while making the
interactive Explorer client-driven.

RTK Query was chosen over hand-written async thunks because it supplies
request-key deduplication, lifecycle states, cache retention, and tag-based
invalidation. Identical endpoint arguments share a cache entry; distinct
requests can run concurrently. Focus/reconnect refetching is enabled globally.
Successful searches refresh search-history and analytics tags. Mutations
invalidate the relevant dataset, record, saved-view, preference, history, or
analytics tags. Analytics refreshes every 60 seconds while the view is active
and focused.

Loading and error states are explicit. Explorer requests keep the visible page
while a replacement query is loading; slow record details use a skeleton and
lazy relationship/history requests so the table remains usable. API failures
are surfaced through the shared error-to-toast middleware and feature-level
error states.

## State management strategy

| State                       | Owner                 | Examples                                                                                                    |
| --------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Server state                | RTK Query cache       | Dataset metadata, current record page, record details, analytics, views, and history                        |
| Global client state         | Redux slices          | Auth/session summary, selected dataset, draft search configuration, saved-view UI state, and UI preferences |
| Shareable navigation state  | URL query string      | Search term, conditions, sort, page, and page size                                                          |
| Temporary interaction state | Component/table state | Open drawer, transient input edits, selection, and resize interaction                                       |

Record pages are held in RTK Query's bounded API cache, not copied into a Redux
feature slice. The application never fetches the complete record set for the
Explorer. This lets memory use follow active pages and cache retention rather
than total dataset size.

See [the request and cache flow](./docs/data-fetching-flow.md).

## Search architecture

Search state is composed in the Explorer, serialized to the URL where
appropriate, and submitted to `GET` or `POST /api/datasets/{id}/records`.
Global text input is debounced by 400 ms. The server validates a whitelist of
fields/operators, checks dataset access, and composes Drizzle SQL expressions
with bound parameters. Conditions combine with `AND`; the server applies
sorting and pagination before returning a page.

Global search uses a generated English `tsvector` and PostgreSQL full-text
search. `contains` uses escaped `ILIKE` patterns; a trigram GIN index is
available for partial matching on `name`. Query totals are cached for 30
seconds by dataset and filter hash, while the result page is queried from
PostgreSQL. Empty search/filter configurations return an empty page without
scanning records. Invalid query shapes return HTTP 400.

PostgreSQL full-text and trigram search were selected over Elasticsearch or
OpenSearch to keep transactional data, permissions, filters, and search in one
system at this scale. The trade-offs and limits are in
[the search architecture note](./docs/search-architecture.md) and the [decision
records](./docs/decisions/).

## Database indexing strategy

PostgreSQL is the source of truth. Drizzle schemas and checked-in migrations
define users, roles, datasets and fields, typed records plus JSONB extras,
relationships, record history, saved views, search history, preferences,
permissions, and query logs.

The record workload has:

- B-tree `(dataset_id, status, country, created_at)` for common combined filters.
- B-tree `(dataset_id, revenue)` and `(dataset_id, created_at)` for
  dataset-scoped range/sort access.
- GIN on the generated full-text vector and GIN `gin_trgm_ops` on record names.
- Supporting unique, foreign-key lookup, history, saved-view, permission, and
  monitoring indexes.

Indexes improve matching query plans at the cost of storage and write work;
they are not a guarantee of a particular latency. Review
[the index decision record](./docs/decisions/0001-postgresql-indexes.md) and
use `EXPLAIN (ANALYZE, BUFFERS)` against representative data.

## Pagination strategy

The records API uses 1-based offset pagination, a maximum page size of 100, and
`LIMIT pageSize + 1` to compute `hasMore`. A cached filtered total supports
page counts and jump-to-page UI. Offset pagination matches the Explorer's
direct page navigation and URL state; deep offsets can become expensive as
datasets grow, so keyset pagination or a hybrid strategy should be evaluated
for sequential workloads at much larger scale.

## Caching strategy

RTK Query deduplicates identical request arguments and retains endpoint results
for configured intervals. Its tags coordinate client cache invalidation;
focus/reconnect refetching and analytics polling keep active data fresh. The
server uses a bounded in-process 30-second count cache and a 60-second
analytics cache. Those server caches are per process, not distributed across
replicas.

## Performance optimization

The Explorer combines server-side filtering/sorting/pagination with
TanStack Virtual row rendering, memoized table data, and retained previous
results while fetching. Virtualization limits DOM work for the current page; it
does not replace server pagination or load millions of rows into the browser.

See [the performance report](./docs/performance-report.md). It is intentionally
marked pending until the benchmark has been run; no latency figures are
invented.

## API documentation

The route catalog, request/response examples, validation rules, and common
errors are documented in [docs/api.md](./docs/api.md). The API is REST-style
JSON and uses the Auth.js session cookie for protected operations.

## Testing strategy

```powershell
npm run test
npm run lint
npm run typecheck
npm run format:check
```

Database-backed integration tests use a dedicated database name ending in
`_test` on port 5433; they never fall back to `DATABASE_URL`:

```powershell
docker compose --profile test up -d --wait postgres-test
npm run test:integration
```

The Playwright runner also requires `TEST_DATABASE_URL` and Chromium. It
provisions a temporary E2E user and isolated fixture data:

```powershell
npx playwright install chromium
npm run test:e2e
docker compose --profile test stop postgres-test
```

Tests cover validation/query building, permissions, API behavior, saved views,
and RTK Query cache invalidation. The E2E flow exercises login, search,
filtering, and saved views.

## Docker

Start PostgreSQL 16, apply the schema, optionally seed demo data, then build
and start the application:

```powershell
docker compose up -d --wait postgres
npm run db:migrate
# Optional demo data:
npm run db:seed -- 100000
docker compose up --build -d app
```

Before these commands, set both database URLs in `.env.local` to the local
Compose PostgreSQL endpoint rather than Neon.

The app waits for PostgreSQL to become healthy. The Compose database persists
in a named volume. The seed command is optional and inserts demo users,
datasets, and records; use it only in a local or disposable database. Open
[http://localhost:3000](http://localhost:3000). Stop the services with
`docker compose down`; add `-v` only when intentionally deleting database
volumes.

The multi-stage `Dockerfile` builds Next.js in standalone mode and runs the
production server as a non-root user. It does not run schema changes during
image build or container startup.

## Deployment: Vercel + Neon

1. Create a Neon project and production branch. Add the DataScope repository
   to Vercel and configure these Production environment variables in the
   Vercel project settings:
   - `DATABASE_URL`: Neon pooled connection string for application traffic.
   - `DATABASE_URL_UNPOOLED`: Neon direct connection string for migrations.
   - `AUTH_SECRET`: a unique secret generated for this deployment (for example,
     `openssl rand -base64 32`). Never reuse the sample or CI secret.
2. Deploy once to create/link the Vercel project and verify its environment
   settings. From a trusted local machine with the Vercel CLI authenticated,
   pull the production variables into `.env.local` and apply migrations:

   ```sh
   vercel env pull .env.local --environment=production
   npm ci
   npm run db:migrate
   ```

   Drizzle Kit loads `.env.local` and prefers `DATABASE_URL_UNPOOLED` for
   migrations. Ensure the Vercel production environment includes that direct
   Neon URL for this pull; do not expose it to client-side code. The app itself
   uses the pooled `DATABASE_URL`.

3. Deploy the application with `vercel --prod`. The GitHub Actions workflow
   also runs install, lint, typecheck, unit tests, and build for pushes and
   pull requests. It uses dummy build-only environment values and never needs
   production credentials.
4. For a staging/demo branch only, configure `.env.local` with that branch's
   database URLs, then run `npm run db:seed -- 100000` after migrations. The
   script accepts 1 to 1,000,000 records. Do not seed production by default:
   it creates demo accounts and data, and those records are not meant to be
   real users. Keep `.env.local` out of version control.

For Docker-based hosting such as Railway, use the same multi-stage Dockerfile,
provide a PostgreSQL-compatible `DATABASE_URL` and unique `AUTH_SECRET`, and
run `npm run db:migrate` from a trusted deployment shell with the connection
values in `.env.local` before directing traffic to the new deployment.
The standalone app image intentionally excludes Drizzle Kit, so migrations
must run in a separate release job/environment with development dependencies.
Run the seed script only against a disposable non-production database.

Do not copy development credentials or local Docker passwords into production.
Configure database backups, secret rotation, HTTPS/trusted-host settings, and
any required rate limiting for the target hosting environment.

## Technical documentation and submission artifacts

- [Frontend architecture diagram](./docs/frontend-architecture.md)
- [Data-fetching flow diagram](./docs/data-fetching-flow.md)
- [Search architecture diagram](./docs/search-architecture.md)
- [Database ER diagram](./docs/er-diagram.md)
- [API documentation](./docs/api.md)
- [Technical decision records](./docs/decisions/)
- [Performance report](./docs/performance-report.md)

The performance report requires an isolated PostgreSQL 16 service and explicit
confirmation before its one-million-row seed. Follow the
[benchmark instructions](./docs/performance-report.md) and the Performance
Optimization section above; never point the benchmark at development or
production data.
