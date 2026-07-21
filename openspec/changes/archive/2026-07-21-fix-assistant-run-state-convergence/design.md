## Context

SkillRunner currently has independent status, canonical message, published transcript, and run-store projections. The foreground stream is gated on an exact `running` state even though a newly submitted task is commonly seeded as `queued`; the session-state subscription used to wake the observer has no producer. A successful waiting reply can also be overwritten by an older waiting projection. Separately, workflow settings keep provider options in one flat draft. ACP option controls visually fall back when an old value is absent from the new catalog, but the draft and provider normalizer can retain and transport that old value.

## Regression Provenance

- `5eceea267d6b5b6c5a6300801c93b7a4975ce94b` introduced the exact-`running` foreground-stream gate, so a newly selected `queued` run could remain without an attached chat stream.
- `e2542a17ca348f482233af267e50112a447e07ae` introduced the waiting-reply continuation path without a generation-bound stale-waiting guard, allowing the answered state to overwrite the resumed stream state.
- `567e1e8f0eac0cad3e357beb3619cfd55fb9fd72` separated transcript publication from the workspace chrome; `dec2819525b630fbd7e703fbe66197256d14801e` repaired publication but still depended on task reselection for the missing observer wake-up.
- `baa2601775f8e352eb811166962c0e27b90f37a3` removed catalog membership enforcement from ACP runtime normalization, allowing a stale backend mode to survive a backend switch when the select control was not touched.
- `bc4b4593510e0cc91ee5a3e09e319927d6c71e38` introduced the exact Assistant Workspace contract projection but bypassed the shared task status projector and omitted shared drawer labels, hiding nullable ACP status axes and exposing the renderer's English Backend fallback.
- `1d0006dab` limited sidebar full-record reads to the selected run but left card Apply fields sourced only from the full record, discarding Backend and Apply facts already present in the lightweight projection for unselected runs.

## Goals / Non-Goals

**Goals:**

- Converge selected SkillRunner status, history, stream cursor, transcript, and counts without task reselection.
- Prevent an answered interaction's stale waiting state from rolling back its continuation.
- Make ACP backend switch semantics explicit: catalog-derived choices reset, workflow-scoped safety/timeout choices persist.
- Validate every ACP runtime selection at the target backend and live session boundaries.
- Restore shared status-axis projection and localized labels for ACP Chat and ACP Skills drawers without changing wire facts.
- Preserve persisted SkillRunner Backend and Apply axes for selected and unselected sidebar cards without restoring per-card full-record reads.

**Non-Goals:**

- Keeping a separate remembered runtime selection per backend.
- Changing silent-mode persistence, public Assistant actions, SkillRunner backend routes, or ACP protocol schemas.
- Replacing the shared Assistant region renderer.

## Decisions

1. The selected SkillRunner entry observer owns management status, pending state, history, and chat stream lifecycle. Run-store state seeds or recovers an observer but cannot overwrite an initialized live observer during snapshot publication.

2. Queued and running non-terminal entries may open the foreground chat stream. Every close, abort boundary, or reconnect performs history catch-up from `lastSeq + 1` before reopening with the converged cursor. Waiting and terminal transitions drain history before closing and publishing.

3. A successful interaction reply creates an interaction/generation-scoped handoff guard. The same answered interaction's stale waiting projection is ignored until management reports running, terminal, or a different interaction. Failed reply submission removes the guard.

4. Live publication advances visible transcript, counts, and transcript revision from the same canonical message state. Boundary mode may hold partial chunks but releases at assistant-final, user/waiting, or terminal boundaries without owner navigation.

5. Provider runtime option schema entries declare whether their value is `workflow`- or `backend`-scoped. The default remains workflow-scoped for compatibility. Backend changes drop backend-scoped values and keys outside the target provider schema before target-backend normalization.

6. ACP selection normalization accepts explicit values only when they belong to the target catalog. A legal explicit value beats the observed current; otherwise the legal observed current is used, and no catalog order is treated as a current value. Raw model is derived from the validated display-model/reasoning pair and never trusted as external input.

7. Live session reconciliation atomically replaces all run-effective selection fields, clearing invalid values before any setter call. Runtime setters validate the current run catalog and never transport a catalog-external action.

8. The shared custom select owns one canonical current value. Trigger text, selected row, callbacks, setter/getter, and workflow collectors all read that same value.

9. ACP Chat, ACP Skills, and SkillRunner task cards use `taskStatusFields()` as the presentation SSOT. Explicit backend and apply facts take priority; absent backend state falls back to main status, and absent apply state becomes `not-required` only for successful tasks and `idle` otherwise. Backend/apply failure may promote the projected main status.

10. ACP Skills always shows Backend and Apply axes. ACP Chat always shows Backend and hides Apply. Exact ACP drawers receive `assistantDrawerLabels()` so axis labels resolve from the existing shared status localization keys. Owner navigation continues to publish nullable backend/apply fields unchanged; fallbacks exist only in the child presentation model.

11. SkillRunner sidebar card materialization prefers the selected run's full record and otherwise preserves `backendStatus`, `applyState`, `applyError`, and `applyNextRetryAt` from the lightweight projection. Full-record-only Apply metadata remains selected-run detail, so `sidebar-active` does not regress to one full-record read per card.

## Risks / Trade-offs

- Opening a queued stream may receive a transient not-ready response. The observer treats it as retryable, refreshes management/history, and uses existing bounded backoff.
- Ignoring stale waiting during a reply handoff could mask a delayed backend transition. The guard is bound to the answered interaction and clears on a new interaction or terminal state, so it cannot suppress a later prompt.
- Backend switching no longer carries a coincidentally equal mode/model into another backend. This is intentional; only workflow-scoped options such as auto-approval and timeout survive.
- Presentation fallback can make an absent backend/apply fact visually explicit. Keeping that fallback in the child model avoids turning inferred display state into a wire-level source of truth.
- Lightweight cards intentionally omit Apply attempt counts and Apply update timestamps. Those details remain available from the selected full record while persisted status, error, and retry facts remain visible during task switching.
