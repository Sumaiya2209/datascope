# DataScope

DataScope is an enterprise data discovery and intelligence platform built with
Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Redux Toolkit, Drizzle
ORM, and PostgreSQL.

## Requirements

- Node.js 22+ (Node.js 24 recommended)
- npm
- Docker Desktop for the local PostgreSQL database

## Local development

Run these commands from the project directory:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `AUTH_SECRET` in `.env` to a generated secret before starting the app.
Registration creates Viewer accounts; assign analyst/admin roles and dataset
grants through controlled administrative workflows.

The seed command generates 100,000 demo records by default, split across the
Customer Accounts and Business Partners datasets. Set a different count from 1
to 1,000,000 with `npm run db:seed -- 250000`. Seeded users have no password
credentials configured.

Authentication uses JWT sessions with the role copied into the session.
Protected app paths are gated by `src/proxy.ts` (the Next.js 16 convention);
server data and mutations
must additionally call `requireRole()` or `requireDatasetAccess()` from
`src/lib/auth/permissions.ts`.

## Records search API

`GET` and `POST /api/datasets/{id}/records` require an authenticated user with
view access to the dataset. Both accept `search`, `conditions`, `sort`, `page`,
and `pageSize`; for GET requests, `conditions` and `sort` are JSON-encoded query
parameters. Pages are 1-based and `pageSize` is limited to 100. An empty search
and filter set returns no records. Results include `records`, `total`, `page`,
`pageSize`, and `hasMore`; totals are cached briefly by dataset and filter hash.

Example POST body:

```json
{
  "search": "Taylor Reed",
  "conditions": [
    { "field": "status", "operator": "eq", "value": "Active" },
    { "field": "revenue", "operator": "gte", "value": 2500 }
  ],
  "sort": [{ "field": "created_at", "direction": "desc" }],
  "page": 1,
  "pageSize": 25
}
```

Supported fields are `status`, `country`, `category`, `revenue`, `created_at`,
`name`, and `email`. Operators are `eq`, `contains`, `gt`, `gte`, `lt`, `lte`,
`between`, and `in`, subject to field type validation.

## Tests and checks

```powershell
npm run test
npx playwright install chromium
npm run test:e2e
npm run lint
npm run typecheck
npm run format:check
```
