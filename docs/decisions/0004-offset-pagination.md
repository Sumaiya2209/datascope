# ADR-0004: Use offset pagination for the Data Explorer

- Status: Accepted
- Date: 2026-11-16

## Problem

The Explorer exposes numbered pages, a page-size selector, and jump-to-page
navigation. It must fetch small pages and report whether another page exists.

## Available Alternatives

- Offset/limit pagination with a filtered count.
- Keyset/cursor pagination based on a stable sort key.
- Fetch all rows and paginate in the browser.

## Selected Approach

Use server-side offset pagination with one-based pages, a maximum page size of
100, deterministic ID tie-breaking, and `LIMIT pageSize + 1` for `hasMore`.
Cache the filtered total by dataset and filter hash for 30 seconds.

## Reason for Selection

Offset pagination maps directly to the numbered page controls and page URL
state requested by the product. Client-side pagination is not suitable for
large datasets. Keyset pagination provides better deep-page behavior but does
not naturally support arbitrary page-number jumps without additional cursor
state or anchor indexing.

## Advantages

- Simple page numbers and direct jumps.
- Stable API contract that works with common database ordering.
- Only one bounded page is returned to the browser.
- The extra-row check can establish `hasMore` without an exact count on every
  request.

## Disadvantages

- Large offsets can require the database to walk many preceding rows.
- Concurrent inserts/deletes can shift rows between page requests.
- The exact total count can itself be expensive on a cold cache.

## Performance Implications

The dataset/revenue indexes support the benchmark's sorted range query, but
they do not eliminate deep-offset work. The dedicated performance test measures
page 1 and page 10,000 and runs matching `EXPLAIN ANALYZE` plans.

## Future Limitations

For sequential browsing on much larger or frequently changing datasets,
consider keyset pagination. A hybrid API could retain offset pagination for
small page numbers and provide a cursor-based mode for deep sequential
navigation.
