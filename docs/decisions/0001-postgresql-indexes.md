# PostgreSQL Index Strategy

## Problem

DataScope needs to filter and page large datasets, support full-text and partial
text search, enforce uniqueness, and serve history and monitoring views without
scanning every row.

## Alternatives

- Rely on primary-key indexes and sequential scans.
- Add broad single-column indexes for each filter.
- Use workload-specific B-tree indexes plus GIN indexes for text search.

## Selected

Use PostgreSQL B-tree indexes for equality, range, ordering, joins, and
uniqueness, and GIN indexes for full-text and trigram search. Dataset-record
indexes lead with `dataset_id` because explorer queries are dataset-scoped.
`dataset_records.search_vector` is a stored English `tsvector` generated from
name, email, status, country, and category. The migration enables `pg_trgm`
before creating its trigram operator-class index.

### Dataset-record indexes

- `dataset_records_filter_idx` on `(dataset_id, status, country, created_at)`
  handles the common combined filters and leaves `created_at` available for
  ordered paging within a status/country selection.
- `dataset_records_dataset_revenue_idx` on `(dataset_id, revenue)` supports
  dataset-scoped revenue ranges and sorting.
- `dataset_records_dataset_created_at_idx` on `(dataset_id, created_at)`
  supports dataset-scoped time ranges and chronological paging without requiring
  status and country filters.
- `dataset_records_search_vector_gin_idx` on the generated `search_vector`
  supports PostgreSQL full-text `@@` queries over the selected typed fields.
- `dataset_records_name_trgm_gin_idx` on `name gin_trgm_ops` supports indexed
  substring and similarity matching with `LIKE`, `ILIKE`, and trigram operators.

### Other table indexes

- `roles_slug_uidx` and `roles_name_uidx` enforce unique role identifiers and
  names.
- `users_email_uidx` enforces unique login emails; `users_role_id_idx` supports
  role membership lookups.
- `datasets_slug_uidx` enforces stable unique dataset URLs;
  `datasets_created_by_idx` supports creator-scoped administration.
- `dataset_fields_dataset_name_uidx` prevents duplicate field keys within one
  dataset; `dataset_fields_dataset_position_idx` orders fields for a dataset.
- `record_relationships_pair_type_uidx` prevents duplicate typed directed
  relationships; `record_relationships_target_idx` finds inbound relationships.
- `record_history_record_created_at_idx` retrieves a record's history in time
  order; `record_history_changed_by_idx` supports actor-based history queries.
- `saved_views_user_dataset_name_uidx` enforces per-user names within a dataset;
  `saved_views_dataset_id_idx` supports listing views by dataset.
- `search_history_user_executed_at_idx` and
  `search_history_dataset_executed_at_idx` support recent-history pages by user
  or dataset.
- `user_preferences_user_id_uidx` enforces one preference document per user.
- `access_permissions_dataset_user_permission_uidx` and
  `access_permissions_dataset_role_permission_uidx` enforce unique grants for
  either principal type. `access_permissions_user_dataset_idx` and
  `access_permissions_role_dataset_idx` support permission checks by principal;
  partial predicates omit the other principal type's null rows.
- `query_logs_created_at_idx` supports time-bounded monitoring;
  `query_logs_dataset_created_at_idx` scopes those reports to a dataset;
  `query_logs_duration_ms_idx` supports slow-query threshold analysis.

## Reason

These indexes match the expected access patterns while keeping the main record
search on server-side SQL. Leading with `dataset_id` narrows scans before
applying a record-level filter. The generated full-text vector avoids
recomputing tokenization per query; trigram indexing covers substring matching,
which full-text token search does not.

## Pros

- Common dataset filters, ranges, and chronological pages can use index scans.
- Full-text and partial matching have purpose-built PostgreSQL indexes.
- Unique and lookup indexes support integrity checks and related-table access.
- The database remains the source of truth; no full record set is loaded into
  the application to search.

## Cons

- Each index consumes disk and adds write cost, especially the generated
  tsvector and GIN indexes.
- The composite filter index is order-sensitive; it is not a universal index
  for arbitrary filters.
- Trigram search is less effective for very short inputs and can be costly for
  broad, low-selectivity patterns.

## Performance

The record indexes aim to reduce work before pagination and keep filter,
ordering, and text-search operations in PostgreSQL. Indexes improve eligible
queries, not every query; validate with `EXPLAIN (ANALYZE, BUFFERS)` against
representative data before claiming latency improvements.

## Future limits

Revisit index order and coverage using query logs and representative query
plans. Very high write volume may require dropping or rebuilding rarely used
indexes. If datasets need different filter combinations or multiple languages,
add measured workload-specific indexes or language-aware search vectors rather
than extending this index set speculatively.
