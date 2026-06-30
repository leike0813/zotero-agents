## Why

SkillRunner sidebar chat could render an empty transcript on Linux even when the
run completed successfully and the surrounding panel rendered normally. The
failure path was isolated to the SkillRunner child panel's transcript scheduling
chain, which depended on a frame callback followed by a timer callback that may
not run reliably in Zotero's Linux chrome iframe environment.

## What Changes

- Replace the SkillRunner transcript render scheduler's
  `requestAnimationFrame -> setTimeout` chain with a microtask-first scheduler.
- Preserve existing transcript revision gating, render-mode gating, pending
  snapshot coalescing, and stale-render token checks.
- Leave ACP panels, the shared transcript renderer, and the dual Assistant
  Workspace host design unchanged.
- Document the exact code-level rollback point so the fix can be reverted
  cleanly if the scheduling change causes regressions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `skillrunner-chat-display-contract`: SkillRunner chat rendering must not
  depend on a timer scheduled from inside `requestAnimationFrame` before
  rendering transcript DOM.

## Impact

- Affected code: `addon/content/sidebar/run-dialog.js`.
- Public APIs: none.
- Data contracts: none.
- Dependencies: none.
- Verification: `npm run build`; Linux Zotero developer-tools probe should
  confirm that the visible SkillRunner iframe renders transcript rows or the
  empty transcript state without requiring a successful `setTimeout` probe.
