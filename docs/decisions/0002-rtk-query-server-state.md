# ADR-0002: Use RTK Query for server state

- Status: Accepted
- Date: 2026-11-16

## Problem

The Explorer and related features need request deduplication, loading/error
states, cache retention, background refresh, and coordinated invalidation
without copying potentially large record pages into hand-managed state.

## Available Alternatives

- RTK Query, integrated with the required Redux Toolkit store.
- Redux async thunks with custom reducers, request status, and cache logic.
- A separate server-state library such as TanStack Query or SWR.
- Direct component-level `fetch` calls.

## Selected Approach

Use RTK Query for API communication and remote-data caching. Keep explicit
Redux slices for small, shared client state such as selected dataset and draft
search configuration.

## Reason for Selection

RTK Query satisfies the Redux Toolkit requirement while providing cache keys,
deduplication, request lifecycle state, polling, focus/reconnect behavior, and
tag invalidation in the existing store. Async thunks would require maintaining
these behaviors manually; a second query library would duplicate cache and
provider infrastructure.

## Advantages

- Identical endpoint arguments reuse the same cache entry and in-flight work.
- Mutations invalidate focused tags instead of requiring broad manual refetches.
- Components get consistent loading, stale-data, and error state.
- API data remains separate from the small feature-state slices.

## Disadvantages

- Cache correctness depends on consistent endpoint arguments and tag design.
- Redux DevTools can show cached response data, so API responses must remain
  bounded and sensitive data should not be added unnecessarily.
- RTK Query is coupled to Redux and is not a drop-in cache for server-rendered
  data.

## Performance Implications

Each records request is bounded by the API page-size limit; retained results
expire according to endpoint-specific `keepUnusedDataFor` values. Identical
queries are deduplicated and active data can refresh on focus/reconnect.
Measurements should track request count and cache hit behavior under actual
navigation patterns.

## Future Limitations

If server rendering needs to hydrate remote data, add a deliberate
server-to-client cache hydration strategy rather than fetching the same data
twice. Revisit cache partitioning if multiple tenants or permission contexts
share a browser session.
