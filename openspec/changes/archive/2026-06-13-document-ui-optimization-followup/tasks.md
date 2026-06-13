## 1. Source Audit

- [x] 1.1 Compare current UI source against `artifact/ui_optimization_summary_20260613.md` and confirm the intended tracked source changes are present.
- [x] 1.2 Confirm generated screenshots, browser profiles, mock data, and SQLite files remain untracked runtime artifacts unless explicitly promoted.
- [x] 1.3 Confirm Workflow Settings dialog layout polish is covered by shared visual-theme expectations rather than descriptor-model behavior.

## 2. UI Implementation Alignment

- [x] 2.1 Verify Assistant panel compact selector rows, icon controls, and reply footer controls preserve readable alignment in normal and narrow sidebar widths.
- [x] 2.2 Verify Dashboard workflow cards use a stable grid layout for arbitrary workflow names and localized labels.
- [x] 2.3 Verify Synthesis Topic Detail left tabs, content cards, hover elevation, and summary hero styling match the shared theme constraints.
- [x] 2.4 Verify shared theme selection and panel tokens remain compatible with participating browser UI surfaces.

## 3. Harness And Verification

- [x] 3.1 Update or preserve readonly harness screenshot tooling so captures wait for mounted Dashboard and Synthesis DOM content instead of fixed sleeps.
- [x] 3.2 Extend existing focused tests only where they protect stable user-visible layout or harness behavior.
- [x] 3.3 Run focused tests for Dashboard workflow cards, Assistant UI smoke, and readonly harness behavior when implementation changes are applied.
- [x] 3.4 Run `npm run build` after implementation changes and ensure generated typings are intentional.

## 4. OpenSpec Validation

- [x] 4.1 Run `openspec validate document-ui-optimization-followup --type change --strict`.
- [x] 4.2 Keep proposal, design, tasks, and delta specs aligned before applying or archiving the change.
