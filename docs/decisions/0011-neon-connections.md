# ADR-0011: Use pooled Neon connections for the app and direct connections for migrations

- Status: Accepted
- Date: 2026-11-16

## Problem

The application has an existing Drizzle ORM and postgres.js connection layer.
It must use the linked Neon PostgreSQL branch without overwriting local
development configuration, while migrations need a connection mode compatible
with schema-management operations.

## Available Alternatives

- Replace the existing database driver with Neon's serverless HTTP/WebSocket
  driver.
- Preserve postgres.js and point application queries at the pooled connection.
- Use a direct connection for all app and migration traffic.
- Put Neon connection values in the checked-in environment template or in the
  existing `.env`.

## Selected Approach

Preserve Drizzle and postgres.js. The application reads `DATABASE_URL` through
Neon's `parseEnv` helper; Neon supplies the pooled connection there. The
Drizzle Kit config loads `.env.local` before `.env` and prefers
`DATABASE_URL_UNPOOLED` for migrations. Keep the generated credentials in the
git-ignored `.env.local`, leaving the existing `.env` untouched.

## Reason for Selection

The Neon Postgres guidance recommends pooled URLs for application traffic and
direct URLs for migrations. Keeping the project's established ORM and driver
limits the migration surface while still using the appropriate Neon endpoint
for each workload. `.env.local` also matches Next.js local environment loading
and takes precedence over the existing local `.env` during app startup.

## Advantages

- The app uses PgBouncer-backed pooling without a driver rewrite.
- Migrations avoid transaction-pooler restrictions by using the direct URL.
- Existing local `.env` values remain intact and act as a fallback.
- Connection strings are ignored by Git and are not embedded in source or
  documentation.
- `parseEnv` validates that the declared Postgres connection is injected.

## Disadvantages

- Developers need the Neon CLI session to refresh local branch credentials.
- Having `.env.local` changes which database the Next.js app uses, while
  one-off seed scripts that load only `.env` may still target local PostgreSQL.
- The application remains coupled to postgres.js and Node-compatible runtime
  behavior.

## Performance Implications

Pooled connections reduce connection churn under concurrent web requests.
Direct migrations avoid PgBouncer transaction-mode limitations. Compare actual
pool behavior and query plans under deployment concurrency; pooling does not
replace query optimization or bounded result pagination.

## Future Limitations

If the app moves to an edge runtime or a platform with short-lived execution
that cannot safely use postgres.js, evaluate Neon's serverless driver and
Drizzle adapter in a separately tested change. Keep migration URLs direct and
keep local secrets outside version control.
