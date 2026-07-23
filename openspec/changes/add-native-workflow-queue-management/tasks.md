## 1. Establish baselines and queue contracts

- [ ] 1.1 Run the focused existing workflow seam, settings-domain, duplicate-guard, task-drawer, Dashboard snapshot, and DOM-identity tests before changes; record any pre-existing failures in the change notes.
- [ ] 1.2 Add failing contract tests in a focused `test/core/*workflow-host-queue-management.test.ts` file for FIFO admission, independent per-submission limits, blank/zero unlimited semantics, pending-only cancellation, cancel/admit races, skipped accounting, subscription events, and shutdown reset.
- [ ] 1.3 Define the Host queue public contracts and sanitized read DTOs under `src/jobQueue/`, including branded submission/queue identities, backend scope, unit display identity, outcome types, cancel results, immutable snapshots, and narrow change events.
- [ ] 1.4 Define `PreparedWorkflowUnit` and `WorkflowRequestBuildPlan` in `src/modules/workflowExecution/contracts.ts`, making one top-level legal selection unit the explicit scheduling and outcome boundary.

## 2. Implement the in-memory Host submission queue

- [ ] 2.1 Implement a process-local queue registry under `src/jobQueue/` with one FIFO controller per submission, independent frozen concurrency, a microtask-scheduled drain, and indexes by queue ID, backend, workflow/input identity, and submission.
- [ ] 2.2 Implement atomic pending-to-admitted and pending-to-canceled transitions so exactly one operation can win, admitted entries leave public snapshots before provider work begins, and stale cancellation never reaches backend cancel APIs.
- [ ] 2.3 Implement submission completion aggregation so admitted outcomes, preparation skips, duplicate refusals, and user-canceled pending units converge into one succeeded/failed/skipped summary.
- [ ] 2.4 Implement lifecycle teardown that prevents new admissions, emits a reset event, settles pending units with an internal skipped shutdown outcome, clears every index/subscription, and writes no persistent queue state.
- [ ] 2.5 Make the queue contract tests pass, including proof that snapshots contain no provider credentials/full payloads and observers need no polling.

## 3. Refactor workflow preparation around execution units

- [ ] 3.1 Extend `test/core/48-workflow-execution-seams.test.ts` with failing tests for ordered top-level units, deferred provider preflight, unit-local expand/short-circuit/skip handling, and unchanged zero-valid-input behavior.
- [ ] 3.2 Refactor `src/modules/workflowExecution/preparationSeam.ts` to return an ordered `WorkflowRequestBuildPlan` rather than treating a flattened request list as the preparation SSOT.
- [ ] 3.3 Preserve source identity, task-name fallback, target parent, aggregate metadata, and preparation statistics on each unit; derive flat provider requests only inside an admitted unit.
- [ ] 3.4 Ensure provider preflight, request building, execution-time file mutations, duplicate confirmation, and apply hooks are not invoked merely by constructing declarative preview data; preserve read-only file-existence checks required by availability-phase declarative rules.
- [ ] 3.5 Update existing preparation seam callers and test fixtures to consume the typed plan without reintroducing parallel request/unit representations.

## 4. Integrate admission with run and apply seams

- [ ] 4.1 Add failing seam/integration tests in `test/core/48-workflow-execution-seams.test.ts`, `test/core/154-skillrunner-sequence-runtime.test.ts`, and `test/core/162-workflow-single-result-integration.test.ts` for slot retention through provider terminal completion, sequence waiting states, step/final apply, apply failure, and subsequent FIFO admission.
- [ ] 4.2 Extract an `executePreparedWorkflowUnit` orchestration path across `src/modules/workflowExecute.ts` and `src/modules/workflowExecution/{runSeam,applySeam}.ts` that returns one opaque terminal unit outcome after required Host apply.
- [ ] 4.3 Route ACP Skills and SkillRunner multi-unit submissions through the Host queue while preserving provider-internal fan-out, sequence serialization, aggregate apply, short-circuit apply, and existing backend state-machine ownership.
- [ ] 4.4 Change ACP Skills blank/zero behavior to admit every top-level unit; keep an explicit value of `1` as serial unit admission.
- [ ] 4.5 Keep Generic HTTP and pass-through outside the Host queue and retain their current full-parallel/serialized dispatch semantics in `src/modules/workflowExecution/runConcurrency.ts`.
- [ ] 4.6 Update trigger-level start/final feedback so it waits for the submission controller, reports one summary, counts canceled queued units as skipped, and does not emit completion UI during plugin teardown.

## 5. Extend the workflow settings domain

- [ ] 5.1 Extend `test/core/49-workflow-settings-domain.test.ts` with failing table-driven cases for `hostOptions.queue.maxConcurrency`: absent/blank/zero normalization, positive integers, invalid negatives/fractions/non-numeric/non-finite values, explicit clearing, and provider-payload exclusion.
- [ ] 5.2 Advance the canonical settings document in `src/modules/workflowSettingsDomain.ts` and `src/modules/workflowSettingsNormalizer.ts` to schema version 2 with a provider-independent Host options domain.
- [ ] 5.3 Preserve reads of version-1 and legacy settings, migrate them without changing workflow parameters/provider choices, and resolve absent Host options to unlimited concurrency.
- [ ] 5.4 Update `src/modules/workflowSettings.ts` merge/write paths so positive limits persist as workflow defaults, explicit blank/zero removes an old limit, and non-persistable run-once options remain excluded.
- [ ] 5.5 Strip Host queue options before workflow hooks/provider request serialization and add an assertion at the normalized provider-boundary test seam.

## 6. Add the declarative preview and maximum-concurrency submit control

- [ ] 6.1 Extend `test/ui/50-workflow-settings-dialog-model.test.ts` and `test/ui/35-workflow-settings-execution.test.ts` first with stable behavioral tests for descriptor separation, non-negative-integer validation, persisted defaults, availability-valid filtering, hidden zero/one-unit list, fixed preview identity after form edits, preparation-plan authority, and multi-unit submit snapshot.
- [ ] 6.2 Add Host-option and `WorkflowExecutionUnitPreview` DTOs to `src/modules/workflowSettingsDialogModel.ts`; reuse the settings-domain normalizer rather than duplicating numeric parsing rules.
- [ ] 6.3 Add a declarative preview builder that evaluates the current selection once through availability/menu-mode `evaluateWorkflowSelection()`, shares selection task-name fallback, and returns ordered display DTOs without execution requests.
- [ ] 6.4 Update `src/modules/workflowSettingsDialog.ts` and `src/modules/workflowSettingsWebDialog.ts` to retain the initial preview unchanged across all form edits and pass one immutable confirmed snapshot to execute-mode preparation as the correctness SSOT.
- [ ] 6.5 Implement the compact two-region dialog: show all legal units one truncated row each only when count is greater than one; place maximum concurrency below that list, or with the regular controls when the list is absent; retain scrolling and narrow-width usability.
- [ ] 6.6 Wire the existing “save workflow defaults” flow and Dashboard workflow-options editor to read/write the Host maximum through the same settings domain; do not persist or otherwise change auto-approve-write semantics.

## 7. Integrate Host-queued identities with duplicate protection

- [ ] 7.1 Extend `test/core/51-workflow-duplicate-guard-seam.test.ts` first with queued-identity matches, canceled-entry disappearance, admission-transition deduplication, and final recheck during serialized confirmation.
- [ ] 7.2 Update `src/modules/workflowExecution/duplicateGuardSeam.ts` to combine existing active-task identities with the queue registry's narrow workflow/input identity query without importing queue entries into task-runtime models.
- [ ] 7.3 Recheck candidate identity immediately before confirmation/application so cancellation removes stale conflicts and admission cannot surface one source unit as both Host-queued and provider-active.
- [ ] 7.4 Preserve the existing explicit per-candidate confirmation contract and skipped accounting for refused duplicates, including overlapping submissions with independently chosen limits.

## 8. Add queued sections to ACP Skills and SkillRunner drawers

- [ ] 8.1 Extend the existing ACP Skills/SkillRunner sidebar model tests (including `test/core/76-skillrunner-run-workspace-singleton.test.ts`, `test/core/94-skillrunner-sidebar-entrypoints.test.ts`, and relevant workspace harness tests) first for section order, default expansion, empty hiding, backend grouping/collapse, display fallback, non-selection, and icon cancel routing.
- [ ] 8.2 Add backend-scoped queue DTO projection to `src/modules/acpSkillsWorkspaceSurface.ts` and `src/modules/skillRunnerSidebarModel.ts` without fabricating ACP owners, SkillRunner run keys, request IDs, or disabled provider placeholders.
- [ ] 8.3 Generalize the shared drawer model/renderer across `src/modules/assistantWorkspacePublication*.ts` and `src/sidebar/assistantWorkspace*.js` to support `Running → Queued → Completed`, section-level collapse, backend-group collapse, stable keyed reconciliation, and hidden empty sections.
- [ ] 8.4 Render queued rows as non-selectable source-level items with truncated task name/workflow context and one Material icon-only cancel action carrying only `queueId`.
- [ ] 8.5 Route drawer cancellation directly to the Host queue service; on a stale admitted row, refresh the drawer and leave existing ACP/SkillRunner backend cancellation behavior untouched.

## 9. Preserve Assistant Workspace region identity

- [ ] 9.1 Add or extend DOM identity tests before renderer changes to prove queue-only add/remove/collapse updates preserve transcript, Runner pane, toolbar, banner, plan, hint, reply, context drawer, details drawer, and permission drawer nodes.
- [ ] 9.2 Give the queued section and each queued backend group drawer-owned signatures containing only visible row data and local collapse state; do not include queue revisions/counts in whole-panel or non-drawer signatures.
- [ ] 9.3 Verify transcript streaming/loading and selected-owner changes do not reset queued collapse state, while queue changes for one backend do not rebuild unchanged drawer sections or backend groups.

## 10. Add backend-tab-only Dashboard queue projections

- [ ] 10.1 Extend `test/core/62-task-dashboard-snapshot.test.ts`, `test/core/163-background-refresh-governance.test.ts`, and the toolbar-popover coverage first to prove queued rows appear only on matching ACP/SkillRunner backend tabs and are excluded from Home, counts, popovers, history, and attention summaries.
- [ ] 10.2 Add a sanitized queued-row DTO and backend-scoped merge in `src/modules/taskDashboardSnapshot.ts`, preserving the existing ordering contract for provider task/history rows while ordering queued rows by submission/unit FIFO.
- [ ] 10.3 Update Dashboard host routing and `addon/content/dashboard/app.js` to render queued rows with no open/details/archive/retry/backend-cancel behavior and one Material icon-only Host cancel action.
- [ ] 10.4 Subscribe the Dashboard runtime only while mounted; refresh a visible matching backend tab on queue changes, mark hidden matching data dirty as needed, and do not rebuild Home or unrelated tab chrome.
- [ ] 10.5 Add the minimal queued-row styling to `addon/content/dashboard/styles.css` using existing table/action tokens and verify the row remains visibly distinct from provider `queued`/`running` states.

## 11. Lifecycle, localization, logging, and documentation

- [ ] 11.1 Register queue startup/reset and teardown with the plugin lifecycle in the existing Host composition root, ensuring subscriptions are disposed and no admission begins after shutdown starts.
- [ ] 11.2 Add structured runtime logs for submission creation, enqueue, admission, pending cancellation, unit settlement, and shutdown discard using stable IDs/reason codes but no full requests, credentials, or sensitive workflow inputs.
- [ ] 11.3 Add the required labels, validation feedback, state text, tooltips, and accessible names to every locale under `addon/locale/*/addon.ftl`; keep user-visible text free of architecture/compatibility explanations.
- [ ] 11.4 Update `doc/components/job-queue.md`, `doc/components/workflow-execution-seams.md`, `doc/components/workflow-settings-dialog-ui.md`, `doc/components/workflow-settings-single-source-submit-flow-ssot.md`, `doc/components/assistant-sidebar-panel-ui-ssot.md`, `doc/components/skillrunner-provider-global-run-workspace-tabs-ssot.md`, and `doc/components/dashboard-modules.md` to document current-state ownership and boundaries.
- [ ] 11.5 Update any affected SSOT invariant YAML only where its existing machine-checked ownership contract changes; do not add historical or migration prose to current-state component documentation.

## 12. Focused and final verification

- [ ] 12.1 Run the focused new/updated core and UI tests after each implementation slice, then run `npm run test:node:core` and `npm run test:node:ui`; resolve failures without weakening observable contracts.
- [ ] 12.2 Run `npm run check:ssot-invariants`, `npm run check:localization-governance`, and any directly affected component/invariant checks.
- [ ] 12.3 Run `npx tsc --noEmit`, targeted ESLint/Prettier checks for changed files, and `npm run build` without starting the development server.
- [ ] 12.4 Run `openspec validate add-native-workflow-queue-management --strict`, review the final diff for accidental Generic HTTP/pass-through/task-history coupling, and document any remaining risk or intentionally deferred work before requesting implementation verification.
