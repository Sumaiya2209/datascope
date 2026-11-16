# ADR-0007: Virtualize Explorer table rows

- Status: Accepted
- Date: 2026-11-16

## Problem

Rendering every visible table row and cell at once increases DOM size and
reconciliation work, particularly with resizable, selectable dynamic columns.

## Available Alternatives

- Render every row in the current page.
- Use TanStack Virtual to render the visible row window.
- Use infinite scrolling with unbounded client-side accumulation.

## Selected Approach

Use TanStack Table for table state and TanStack Virtual for row-window
rendering. Keep server-side pagination capped at 100 records; do not accumulate
the full dataset in the browser.

## Reason for Selection

Virtualization reduces DOM work while preserving the table's column and
selection behavior. It complements pagination rather than replacing it.
Infinite accumulation would grow client memory over time and complicate
sorting/filtering consistency.

## Advantages

- Limits mounted rows to the viewport plus a small overscan region.
- Keeps large-scale filtering, sorting, and pagination on PostgreSQL.
- Supports the existing dynamic columns and table interactions.

## Disadvantages

- Virtualized row heights and accessibility need careful handling.
- Browser find-in-page and screen-reader navigation do not see unmounted rows.
- At a 100-row page cap, virtualization's gains are smaller than for an
  unbounded client table.

## Performance Implications

Virtualization reduces layout and React work for rendered rows, but network
latency and SQL plan quality still dominate many searches. The performance
benchmark separately measures API latency; browser responsiveness should be
profiled in a real browser with representative row/column counts.

## Future Limitations

If page sizes or row content become much larger, validate estimates with
variable-height rows and accessibility tools. Avoid removing server pagination
on the assumption that virtualization makes a million-row client payload safe.
