## Context

Assistant Workspace publishes transcript snapshots with monotonically increasing
revisions, but the child frames should not depend on browser message delivery
preserving that order. ACP Chat, ACP Skills, and the SkillRunner run dialog
already use revision equality as a render skip, which bounds duplicate work but
does not protect correctness when an older snapshot is delivered after a newer
one.

ACP Skills also has paged transcript history. Its guard cannot simply drop
every equal revision snapshot, because the user may request a different cursor
within the same transcript revision while scrolling history.

## Decisions

1. Keep the guard child-local.

   The host is not changed to promise message ordering. Each child compares the
   incoming transcript revision against the highest rendered revision for the
   current context.

2. Scope by context before comparing revisions.

   ACP Chat uses backend plus conversation identity. ACP Skills uses request id.
   The run dialog uses request id plus selected workspace task where available.
   When the context changes, transcript render state is reset so lower
   revisions from the new context are not rejected.

3. Reject only lower revisions.

   Equal revisions keep the existing early-return behavior only when the
   existing render signatures also match. ACP Skills therefore still merges an
   equal-revision page for a different cursor and can update the virtual window.

4. Preserve loading and failed states.

   Loading and failed transcript states remain current-context UI states and
   are rendered before the stale transcript content guard can skip work.

## Risks / Trade-offs

- [Risk] Source-level smoke tests can become implementation-aware. -> Assertions
  check for the stable stale-guard concepts rather than exact functions or
  wording.
- [Risk] A future context identifier may be missing. -> The context key uses the
  identifiers each panel already exposes; missing values only reset to an empty
  scoped key and do not affect other panels.

## Migration Plan

No data migration is required. Existing snapshots continue to use the same
shape; the child scripts simply ignore stale same-context transcript updates.

## Open Questions

None.
