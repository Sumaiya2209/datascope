# ADR-0009: Separate server, global, URL, and local state

- Status: Accepted
- Date: 2026-11-16

## Problem

Mixing cached API responses with UI preferences and draft input in one store
creates duplicated state, broad invalidation, and unnecessary retention of
large records.

## Available Alternatives

- Put all state, including API responses, in ordinary Redux slices.
- Keep all state in component hooks.
- Use RTK Query for server state, Redux slices for shared client state, URL
  parameters for applied search, and component state for transient interaction.

## Selected Approach

Keep remote responses in RTK Query. Use Redux slices for shared client state
(auth/session summary, selected dataset, draft search configuration, saved-view
UI state, and UI preferences). Keep applied search configuration in the URL
and transient interaction state in components/table state. Do not copy record
arrays into normal feature slices.

## Reason for Selection

Each owner has different lifecycle semantics: API state needs cache
invalidation, applied search needs navigation persistence, and transient
controls should not require global dispatch. Separating them reduces
duplication and clarifies refresh behavior.

## Advantages

- Record data has an explicit, bounded cache owner.
- Draft and applied search states do not silently diverge.
- UI-only preferences do not trigger unrelated server refetches.
- Feature components can own transient state without expanding global state.

## Disadvantages

- Some interactions cross boundaries and need explicit synchronization.
- URL parsing, Redux draft initialization, and saved-view application must stay
  consistent.
- Debugging can require inspecting more than one state source.

## Performance Implications

Avoiding record copies reduces serialization and memory pressure in Redux
reducers. RTK Query can share cached results among consumers; URL changes
identify applied requests. Measure rerenders and cache size as page
configurations expand.

## Future Limitations

If new state must survive reload or be shared, decide whether it belongs in a
saved view, URL, user preference, or server cache before adding another
persistent client slice.
