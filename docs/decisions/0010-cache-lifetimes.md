# ADR-0010: Use bounded client and server cache lifetimes

- Status: Accepted
- Date: 2026-11-16

## Problem

Repeated dataset, record, analytics, and count requests need reuse, but stale
or unbounded cached data can consume memory and misrepresent changing records.

## Available Alternatives

- Disable caching and refetch every view.
- Keep all responses indefinitely in a browser or server cache.
- Use endpoint-specific RTK Query retention and bounded, expiring server
  caches.
- Add a shared Redis cache immediately.

## Selected Approach

Use RTK Query's endpoint cache with configured retention, global focus/reconnect
refetching, and tag invalidation. The records route caches filtered totals in a
bounded 512-entry in-process map for 30 seconds. Analytics uses a bounded
256-entry in-process map for 60 seconds and sends a private 60-second
Cache-Control response.

## Reason for Selection

The application needs reuse for repeated queries without introducing another
service for its current single-process/local deployment. Expiration bounds
staleness and memory, while the API tags keep active client views synchronized
after mutations.

## Advantages

- Reduces repeated count and analytics work.
- Client invalidation is tied to affected datasets and resources.
- Entry caps and TTLs bound process memory and stale duration.
- No new infrastructure is required for local development.

## Disadvantages

- In-process server caches are not shared across Next.js replicas.
- A cache miss can still perform expensive aggregates/counts.
- TTL-based server values can remain stale until expiry if no server-side
  invalidation path is available.

## Performance Implications

The performance script measures first-request and warm count-cache response
latency. Analytics cache behavior is time-bounded; query plans and workload
measurements should guide any TTL changes.

## Future Limitations

For multi-instance production deployments, decide whether to accept per-process
cache duplication or move cache entries to a shared system with explicit
invalidation/versioning. Revisit retention as response sizes and concurrent
users grow.
