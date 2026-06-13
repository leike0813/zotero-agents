## Why

`artifact/ui_optimization_summary_20260613.md` records a set of UI polish and
readonly harness verification improvements that were produced in the
`explore-harness-ui-code` worktree. Those improvements now need an OpenSpec
follow-up so the visual behavior, layout invariants, and harness validation
path are captured as project contracts rather than remaining only as an
implementation summary.

## What Changes

- Capture assistant sidebar alignment expectations for compact selector rows,
  action buttons, and shared panel controls.
- Capture dashboard/workflow visual layout expectations under the shared visual
  theme without changing workflow runtime behavior.
- Capture Synthesis Topic Detail visual refinements for left navigation tabs,
  card spacing, hover elevation, and summary hero separation.
- Capture readonly harness screenshot/DOM readiness expectations so future UI
  verification waits for mounted content instead of relying on fixed sleeps.
- Preserve the existing rule that runtime artifacts such as browser profiles,
  screenshots, local mock data, and SQLite files are not source artifacts unless
  explicitly promoted.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `zotero-skills-visual-theme`: Cross-surface visual polish and shared layout
  invariants are being promoted to visual-theme requirements.
- `assistant-sidebar-ui`: Assistant panel compact control alignment and
  copy-friendly shared surface behavior are being clarified.
- `synthesis-tab-ui`: Synthesis Topic Detail visual layout requirements are
  being tightened for readable research surfaces.
- `ui-readonly-harness`: The local readonly harness is being extended with
  screenshot-readiness and artifact hygiene expectations.

## Impact

- Affected source areas:
  - `addon/content/dashboard/assistant-panel-shared.css`
  - `addon/content/dashboard/styles.css`
  - `addon/content/dashboard/workflow-settings-dialog.css`
  - `addon/content/shared/theme.css`
  - `addon/content/synthesis/styles.css`
  - `addon/content/harness/harness-host.js`
  - `test/core/79-dashboard-home-workflow-doc-bubbles.test.ts`
  - `test/core/97-acp-ui-smoke.test.ts`
- Affected verification flow:
  - CSS/layout smoke checks for assistant, dashboard, workflow settings, and
    synthesis surfaces.
  - Readonly harness screenshot capture that waits for DOM-mounted content.
- No backend protocol, ACP runtime, workflow execution, or persistence contract
  changes are intended.
