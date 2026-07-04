## Context

ACP Skills already persists large run data outside the plugin run store: `transcript.jsonl` is the transcript source of truth and the in-memory mirror is a bounded live read model. The remaining hot path is the Assistant Workspace ACP Skills snapshot: the selected run projection still embeds the full transcript into `selectedRun.transcriptItems`, and the workspace host rebuilds ACP Skills snapshots for unrelated run changes because the store subscription has no request-scoped descriptor.

The UI must still allow users to scroll back through a complete run transcript. A tail-only snapshot would reduce payload size but would remove historical browsing, so this change introduces paged transcript loading plus child-local virtualization.

## Goals / Non-Goals

**Goals:**

- Keep host-to-child ACP Skills snapshots bounded.
- Preserve complete transcript browsing through scroll-triggered page requests.
- Avoid ACP Skills snapshot rebuilds for clearly unrelated run-scoped streaming changes.
- Keep the existing shared transcript renderer and ACP Skills business actions stable.

**Non-Goals:**

- No transcript search or jump-to-index feature.
- No changes to ACP Chat, Dashboard, Synthesis, workflow apply, or session recovery semantics.
- No persistence for child page cache or virtual render state.

## Decisions

1. Use `selectedTranscriptPage` instead of `selectedRun.transcriptItems`.

   `selectedRun` remains run metadata. Transcript content travels in a separate bounded page DTO with `cursor`, `prevCursor`, `nextCursor`, `total`, `eventSeq`, and `transcriptRevision`. This makes the payload contract explicit and prevents future selected-run projections from accidentally becoming full-record DTOs again.

2. Use absolute mirror indexes as cursors.

   The existing transcript mirror already stores ordered `itemIds`, so an absolute item index is the cheapest cursor and supports stable previous/next page reads. The default request without a cursor returns the tail page.

3. Add conservative change descriptors to the existing subscription.

   The listener remains compatible with old no-argument callbacks, but new callers can receive `{ requestIds, kinds, global }`. Unknown changes are `global`, so the guard can only skip work when the store has enough structured information.

4. Keep virtualization local to `acp-skill-run.js`.

   The shared transcript renderer already handles item signatures, markdown, tool grouping, and copy controls. Rewriting it would widen risk across ACP Chat and run dialog, so ACP Skills slices the cached transcript window and passes only that slice into the existing renderer.

5. Force snapshots after user actions and init; guard only ordinary store-change posts.

   User actions, tab activation, and child readiness must remain responsive even if a generated signature matches the previous payload. The signature guard is only for ordinary change-driven snapshots.

## Risks / Trade-offs

- [Risk] Scroll virtualization with variable-height rows can produce imperfect spacer heights. → Use conservative estimated row height and keep page cache bounded; if Gecko behavior is unstable, keep paged payloads and fall back to bounded page rendering.
- [Risk] Change descriptors may miss a path. → Unknown paths remain global and use the old refresh behavior.
- [Risk] Signature computation could become expensive. → Compute it from already-bounded snapshot data and exclude `generatedAt`.
- [Risk] Child cache may evict a page the user scrolls back to. → Re-request by cursor; transcript JSONL/mirror remains the source of truth.

## Migration Plan

No data migration is required. Existing persisted transcripts remain in `transcript.jsonl`; old test fixtures that still include `selectedRun.transcriptItems` are tolerated only as compatibility fallback in child-side projection.

Rollback is straightforward: keep `selectedTranscriptPage` unused and restore full selected transcript projection, but that would reintroduce the memory/payload issue and should only be used for emergency diagnosis.

## Open Questions

None.
