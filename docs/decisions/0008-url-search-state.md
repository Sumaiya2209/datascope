# ADR-0008: Persist applied search state in the URL

- Status: Accepted
- Date: 2026-11-16

## Problem

Explorer search state should survive reloads and navigation and should be
shareable/bookmarkable without storing every applied query only in memory.

## Available Alternatives

- Keep all search state only in component or Redux memory.
- Persist state in local storage.
- Serialize applied search, filters, sorting, page, and page size to URL query
  parameters.

## Selected Approach

Use URL query state for the applied global search, conditions, sort, page, and
page size. Keep draft filters in Redux until the user applies them. Saved-view
application restores the configuration and synchronizes the URL.

## Reason for Selection

URLs naturally integrate with browser back/forward, refresh, bookmarking, and
navigation. They make applied queries reproducible without a separate
persistence mechanism.

## Advantages

- Refresh and browser history preserve the current exploration.
- A link can reproduce an applied query when the recipient has dataset access.
- The URL is the explicit boundary between draft and applied search state.

## Disadvantages

- Complex filter sets lengthen URLs and require parsing/validation on restore.
- A changed field schema can make an old bookmarked query invalid.
- Search terms and filter values may be stored in browser history, copied into
  logs, or sent in referrer data.

## Performance Implications

URL updates are client-side and do not themselves fetch records. RTK Query
deduplicates requests with identical normalized arguments. The global search
debounce prevents transient URL/search requests while typing.

## Future Limitations

Do not place secrets or sensitive personal data in URL state. If query
configurations exceed practical URL size or require access-controlled sharing,
store them as saved views and use an opaque identifier in the URL.
