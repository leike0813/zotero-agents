## 1. Literature Cleanup Closure

- [x] Read canonical cleanup proposals in `getSynthesisSnapshotInput()`.
- [x] Enrich cleanup DTOs with paper/reference/work titles and decision summary.
- [x] Recompute open cleanup counts from canonical proposal status.
- [x] Ensure cleanup approve/reject/skip is visible without projection rebuild.

## 2. Topic Graph Review Cards

- [x] Render relation titles with source/relation/target text without
      truncating key titles.
- [x] Remove edge/review ids from primary review content.
- [x] Include confidence, evidence/provenance, diagnostics, and decision impact
      in card details.

## 3. Optimistic Review Queue

- [x] Add local optimistic review decision tracking.
- [x] Hide the current review item immediately after a scoped review action.
- [x] Restore the item on command failure.
- [x] Preserve existing single-flight behavior for duplicate scoped commands.

## 4. Render Stability

- [x] Preserve main/tab scroll position across background snapshots.
- [x] Avoid using action/status changes as a reason to reset large content
      position.

## 5. Verification

- [x] Update focused UI and literature/topic graph tests.
- [x] Run OpenSpec validation.
- [x] Run focused core tests.
- [x] Run TypeScript and Prettier checks for changed files.
