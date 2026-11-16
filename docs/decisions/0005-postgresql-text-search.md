# ADR-0005: Use PostgreSQL full-text and trigram search

- Status: Accepted
- Date: 2026-11-16

## Problem

Users need global token-oriented search and partial text matching while
combining search with dataset-scoped filters and authorization.

## Available Alternatives

- PostgreSQL full-text search only.
- PostgreSQL full-text search plus `pg_trgm` for substring matching.
- An external search engine such as Elasticsearch or OpenSearch.
- Case-insensitive substring scans without a text index.

## Selected Approach

Use a generated English `tsvector` over name, email, status, country, and
category for global search. Use escaped `ILIKE` matching for the `contains`
operator and a `gin_trgm_ops` GIN index on `dataset_records.name`.

## Reason for Selection

The current product's search is structured around PostgreSQL data and
permissions. Keeping search in PostgreSQL avoids a second index pipeline and
keeps filters, access scope, and transactional records together. Full-text and
trigram indexes address distinct token and substring workloads.

## Advantages

- Search and structured filters execute in the same parameterized SQL query.
- No asynchronous external index is required to reflect record changes.
- Full-text and trigram indexes support the current global and partial-match
  use cases.

## Disadvantages

- English tokenization is not multilingual search.
- The current trigram index covers names, not every text field.
- Broad substring searches and very short terms can still be expensive.
- External engines can offer richer relevance tuning, fuzzy matching, and
  independent search scaling.

## Performance Implications

GIN indexes can reduce text-search scans but increase disk use and write
amplification. Search latency and actual plan/index selection must be measured
on realistic cardinalities; do not infer performance from index presence alone.

## Future Limitations

Consider Elasticsearch/OpenSearch when requirements include advanced ranking,
faceting at higher scale, multilingual analyzers, or search throughput that
cannot be met by PostgreSQL. Introduce it only with an explicit consistency,
reindexing, and permission-filter design.
