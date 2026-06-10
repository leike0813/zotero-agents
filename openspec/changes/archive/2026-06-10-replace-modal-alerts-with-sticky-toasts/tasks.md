## 1. Workflow Feedback Implementation

- [x] 1.1 Extend `src/modules/workflowExecution/feedbackSeam.ts` so workflow execution toasts can be sticky and do not auto-close.
- [x] 1.2 Add bounded visible-toast tracking in the workflow feedback seam and enforce a maximum of 3 visible workflow execution toasts, closing or removing the oldest toast when needed.
- [x] 1.3 Replace workflow execution modal alert routes with sticky toast routes for finish summaries, skipped/no-input summaries, context/preparation failures, and menu trigger failures.
- [x] 1.4 Preserve `execution.feedback.showNotifications=false` so disabled workflows emit no workflow execution reminder toasts while still writing runtime logs.
- [x] 1.5 Keep unrelated confirmation/admin dialogs on their existing modal APIs when user confirmation is required.

## 2. Tests

- [x] 2.1 Update workflow feedback seam tests to assert finish summaries are emitted as non-blocking sticky toasts rather than modal alerts.
- [x] 2.2 Add or update a focused test proving visible workflow execution toasts are capped at 3 and newer notifications are retained.
- [x] 2.3 Update workflow execution integration tests covering enabled and disabled `execution.feedback.showNotifications` behavior.
- [x] 2.4 Run the smallest relevant test commands for workflow execution feedback and loader/schema coverage.

## 3. Documentation And Verification

- [x] 3.1 Update workflow notification documentation to describe sticky non-blocking toasts and the visible count cap.
- [x] 3.2 Review workflow execution alert call sites to confirm no workflow completion or trigger-failure path still uses a blocking modal alert.
- [x] 3.3 Record validation results and any remaining runtime-specific risks before archiving the change.

## Validation Notes

- `tsx node_modules/mocha/bin/mocha "test/core/48-workflow-execution-seams.test.ts" "test/core/37-pass-through-provider.test.ts" "test/core/34-generic-http-provider-e2e.test.ts" "test/core/47-workflow-log-instrumentation.test.ts" --require test/setup/zotero-mock.ts --reporter dot` passed.
- `tsx node_modules/mocha/bin/mocha "test/node/core/20-workflow-loader-validation.test.ts" --require test/setup/zotero-mock.ts --reporter dot --grep "showNotifications"` passed.
- `tsc --noEmit` passed.
- `prettier --check` on changed source, test, doc, and change artifact files passed.
- Full `test/node/core/20-workflow-loader-validation.test.ts` still has pre-existing hook import path failures unrelated to this change when run as a whole in this environment.
