## Why

Assistant Workspace reuses managed reply DOM and a long-lived child frame across interaction and panel lifecycles. The reply listener currently retains the first interaction token, while a temporary SkillRunner host detach resets the producer transcript revision without resetting the consumer, so a later valid reply can be rejected and the first reattached transcript publication can be discarded as stale.

## What Changes

- Make the stable reply controls read the current action payload at click time while preserving the reply textarea, button, and unrelated managed-region DOM identities.
- Separate temporary SkillRunner host detach from complete runtime teardown so transcript revision and published transcript state remain monotonic across detach/reattach.
- Lock same-owner reactivation and A→B→A history convergence with lifecycle-aware regression tests.
- Document the live action-state and transcript publication-clock invariants in the Assistant sidebar UI SSOT.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-shell-interaction-bridge`: Stable reply controls use the current validated action payload without rebuilding managed DOM.
- `skillrunner-sidebar-host-runtime`: Temporary host detach preserves the transcript publication clock and published transcript state until complete runtime teardown.
- `task-dashboard-skillrunner-observe`: Selected-run transcript observation converges on first reattach or first task return while preserving monotonic revisions and history order.

## Impact

- Affected implementation: `src/sidebar/assistantPanelRenderer.js` and `src/modules/skillRunnerRunDialog.ts`.
- Affected test infrastructure and suites: `test/helpers/skillRunnerWorkspaceSnapshotHarness.ts`, `test/core/97-acp-ui-smoke.test.ts`, and `test/core/71-skillrunner-run-dialog-ui-e2e-alignment.test.ts`.
- Affected documentation: `doc/components/assistant-sidebar-panel-ui-ssot.md`.
- No wire-schema, DTO-field, backend protocol, locale, CSS, or dependency changes.
