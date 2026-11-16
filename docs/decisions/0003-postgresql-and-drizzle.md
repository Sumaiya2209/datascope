# ADR-0003: Use PostgreSQL with Drizzle ORM

- Status: Accepted
- Date: 2026-11-16

## Problem

The platform combines relational entities and access grants with large
filterable records, group-by analytics, generated search columns, JSONB
extensions, and database-enforced integrity.

## Available Alternatives

- PostgreSQL with a typed SQL-oriented ORM.
- A document database such as MongoDB with application-level relationship
  handling.
- PostgreSQL with Prisma or handwritten SQL.

## Selected Approach

Use PostgreSQL 16 as the primary database and Drizzle ORM/drizzle-kit for typed
queries, schema definition, and migration generation. Keep optional
record-specific properties in JSONB while common search/filter fields remain
typed columns.

## Reason for Selection

PostgreSQL supports the required joins, transactions, aggregation, generated
`tsvector`, GIN/B-tree indexes, and JSONB in one database. Drizzle provides
typed table and query APIs while allowing explicit PostgreSQL SQL expressions
where database features are needed.

## Advantages

- Referential integrity and transactions cover users, grants, datasets,
  records, views, and history.
- Aggregations and filtering run close to the data.
- JSONB supports extra record attributes without sacrificing typed common
  fields.
- Migrations and query code stay in the application repository.

## Disadvantages

- PostgreSQL-specific search and index features reduce database portability.
- Complex SQL and index behavior still require database expertise.
- Drizzle does not remove the need to inspect generated SQL and query plans.

## Performance Implications

Index-supported filtering and server-side aggregation avoid transferring all
records to the application. Indexes add storage and write costs. Actual query
plans must be checked with `EXPLAIN ANALYZE` on representative data.

## Future Limitations

If datasets become extremely write-heavy, geographically distributed, or
require cross-region analytics, revisit partitioning, read replicas, and
specialized analytical/search stores. Preserve PostgreSQL as the source of
truth unless measured requirements justify additional systems.
