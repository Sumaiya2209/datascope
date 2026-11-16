# ADR-0006: Debounce global search input

- Status: Accepted
- Date: 2026-11-16

## Problem

Sending a full-text request for every keystroke wastes server and database
work, especially when users type a multi-character query quickly.

## Available Alternatives

- Submit every keystroke immediately.
- Debounce until the user pauses.
- Require an explicit submit for every global search.
- Throttle requests at a fixed maximum rate.

## Selected Approach

Apply a 400 ms debounce to the Explorer's global search input. Filter-builder
changes are applied through the search controls; they are not treated as an
unbounded per-keystroke stream. RTK Query deduplicates identical request
arguments.

## Reason for Selection

A short idle window reduces transient requests while retaining the expected
interactive search experience. It does not impose a separate delayed submit
step for global text search.

## Advantages

- Reduces API and database request frequency while a query is being typed.
- Keeps the input responsive because only request dispatch is delayed.
- Works with the existing RTK Query cache and URL synchronization.

## Disadvantages

- Results wait briefly after typing stops.
- A fixed delay may not fit every network or user preference.
- Debouncing does not reduce requests when users pause between every
  keystroke; server-side limits and query efficiency still matter.

## Performance Implications

The performance script uses Playwright to count records API requests during
typing and through the debounced response. The expected benefit must be
confirmed with that measurement, not assumed from the timer value.

## Future Limitations

If the product adds configurable search latency, keyboard-submit workflows, or
very high concurrent traffic, evaluate a user-adjustable delay, cancellation of
in-flight requests, or server-side rate limiting.
