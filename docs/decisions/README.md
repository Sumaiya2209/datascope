# Technical decision records

These records document the current implementation choices using the required
format in [0000-template.md](./0000-template.md). Status `Accepted` means the
decision describes the repository's current approach; it does not claim that
the approach has been production-benchmarked.

| ADR                                      | Decision                                        |
| ---------------------------------------- | ----------------------------------------------- |
| [0001](./0001-postgresql-indexes.md)     | PostgreSQL indexes for record workloads         |
| [0002](./0002-rtk-query-server-state.md) | RTK Query for server state                      |
| [0003](./0003-postgresql-and-drizzle.md) | PostgreSQL and Drizzle                          |
| [0004](./0004-offset-pagination.md)      | Offset pagination for the Explorer              |
| [0005](./0005-postgresql-text-search.md) | PostgreSQL full-text and trigram search         |
| [0006](./0006-search-debounce.md)        | Debounce global search                          |
| [0007](./0007-virtualized-table.md)      | Virtualize Explorer rows                        |
| [0008](./0008-url-search-state.md)       | Keep applied search state in the URL            |
| [0009](./0009-state-ownership.md)        | Separate server, global, URL, and local state   |
| [0010](./0010-cache-lifetimes.md)        | Bounded client and server cache lifetimes       |
| [0011](./0011-neon-connections.md)       | Pooled runtime and direct migration connections |
| [0012](./0012-neon-agent-tooling.md)     | Neon plugin and agent tooling scope             |
