# Data-fetching flow

The browser owns interaction state and asks the API for only the data needed by
the current view. The server owns authorization, validation, SQL construction,
and aggregation.

```mermaid
sequenceDiagram
  participant UI as Feature component
  participant URL as URL query state
  participant RTK as RTK Query cache
  participant API as Next.js route handler
  participant Auth as Auth.js and permissions
  participant DB as Drizzle
  participant PG as PostgreSQL

  UI->>URL: Read/apply search, filters, sort, page
  UI->>RTK: Query(endpoint, serialized arguments)
  alt Identical request is in flight or cached
    RTK-->>UI: Reuse the matching cache entry
  else Cache miss or refetch
    RTK->>API: GET/POST /api/... with session cookie
    API->>Auth: Authenticate, then authorize dataset/role
    Auth-->>API: Authorized principal or 401/403/404
    API->>API: Validate request with Zod
    API->>DB: Build parameterized Drizzle query
    DB->>PG: Filter/order/aggregate/paginate
    PG-->>DB: Only requested page or aggregate rows
    DB-->>API: Typed query results
    API-->>RTK: JSON response and status
    RTK-->>UI: Cached result plus loading/error state
  end

  Note over UI,RTK: Keep visible results during replacement-page fetches
  Note over RTK: Focus/reconnect refetching; endpoint cache retention
  UI->>RTK: Mutation (e.g. save view or preferences)
  RTK->>API: Authorized mutation request
  API-->>RTK: Mutation result
  RTK->>RTK: Invalidate affected tags and refetch active queries
```

## Cache and concurrency behavior

- RTK Query's endpoint-plus-argument cache key deduplicates identical requests.
  Separate arguments remain separate cache entries and can run concurrently.
- Endpoint `keepUnusedDataFor` values bound how long inactive results remain.
  Focus and reconnect refetches are enabled by the shared API configuration.
- Mutations invalidate relevant tags rather than manually rewriting every
  cache entry. A successful record search refreshes search history and
  analytics because the search is persisted and contributes to those views.
- Analytics uses a 60-second polling interval while focused. On the server,
  analytics aggregates are cached in-process for 60 seconds; filtered record
  totals use a 30-second in-process cache.
- Error responses flow through RTK Query's error lifecycle and the shared toast
  middleware. Feature components also render inline error, loading, and empty
  states.

The API response contains one bounded page rather than an entire dataset.
Record details, relationships, and history use separate requests so the table
does not wait for those secondary resources.
