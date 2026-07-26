## Context

Workflow execution currently builds a flat request batch, creates one short-lived `JobQueueManager`, enqueues every request immediately, waits for queue idle, and then applies batch results. The queue controls provider dispatch concurrency, but it has no global read model, pending-item cancellation, or durable identity outside the owning execution call. Its `queued` value belongs to `JobState`, is projected through task/runtime stores, and is not a reliable statement that a request has not reached a backend. SkillRunner local run records can also be created before provider submission, while ACP Skills runs become visible only after a backend request identity exists.

The submit settings dialog opens before the workflow execution preparation seam. It therefore has workflow/provider settings but no scoped selection-unit DTO. Declarative selection validation already provides the required safe preview boundary: `evaluateWorkflowSelection()` can resolve filtered scoped selection contexts without running workflow preflight, `buildRequest`, provider, or apply hooks.

The two task drawers use different sources. ACP Skills navigation is derived from ACP run owners; SkillRunner drawer sections are derived from SkillRunner run/task projections. Dashboard Home and the active-task popover consume active task read models, while backend tabs construct backend-scoped task tables. A Host queue must feed only the drawer/backend-tab surfaces without becoming a fake ACP owner, SkillRunner run, backend request, active task, or history record.

Relevant constraints include:

- concurrency is fixed independently for each user submission;
- blank and `0` mean unlimited;
- one admitted execution unit holds its slot through terminal execution and required Host apply, including sequence interaction waits;
- only ACP Skills and SkillRunner workflow submissions participate;
- pending entries are memory-only and never restored after restart;
- only declarative selection filtering is allowed in the pre-submit preview;
- queued drawer changes must not rebuild transcript or unrelated managed regions;
- existing preflight expansion, short-circuit apply, aggregate apply, duplicate confirmation, workflow feedback, and provider state-machine ownership must remain coherent.

## Goals / Non-Goals

**Goals:**

- Establish one typed Host-owned queue domain for workflow units that have not been submitted to any backend.
- Make the admission unit match the workflow selection/preflight unit rather than an arbitrary flattened backend request.
- Resolve and freeze an independent concurrency policy once for every submission.
- Provide FIFO admission, pending cancellation, backend-scoped observation, duplicate-guard participation, and deterministic submission completion.
- Keep the queue ignorant of ACP and SkillRunner status values by awaiting an opaque execution completion contract.
- Add a normalized, persistable Host queue option without sending it through provider runtime options.
- Add a safe, read-only legal-unit preview to the submit dialog.
- Project queued entries into ACP Skills, SkillRunner, and backend Dashboard surfaces while preserving their existing selection and rendering invariants.
- Preserve full backend dispatch when the option is unset, including changing ACP multi-unit submissions to unlimited admission by default.

**Non-Goals:**

- Persisting or restoring queue entries across plugin restarts.
- Pausing, resuming, reordering, reprioritizing, or bulk-canceling queued entries.
- Canceling a unit after it has been admitted; existing backend/run cancellation remains authoritative then.
- Applying the Host queue to Generic HTTP, pass-through, ACP Chat, Host Bridge agent-owned runs, Synthesis operations, or embedded Zotero MCP tool calls.
- Displaying queued entries on Dashboard Home, in summary counts, in the active-task popover, or in completed/history surfaces.
- Running workflow preflight or request-building hooks merely to populate the submit preview.
- Creating backend request IDs, ACP owners, SkillRunner run keys, task-runtime records, or history rows for pending queue entries.
- Persisting the auto-approve-write option or otherwise changing its current run-once semantics.

## Decisions

### 1. Add a Host submission queue above the existing provider job queue

Create a focused queue service under `src/jobQueue/` with one process-local registry and one controller per submission. The service owns only pre-admission units:

```ts
type WorkflowSubmissionId = string;
type WorkflowQueueEntryId = string;

type QueuedWorkflowUnit = {
  queueId: WorkflowQueueEntryId;
  submissionId: WorkflowSubmissionId;
  unitId: string;
  workflowId: string;
  workflowLabel: string;
  taskName: string;
  inputUnitIdentity?: string;
  backendId: string;
  backendType: "acp" | "skillrunner";
  createdAt: string;
};

type WorkflowSubmissionQueueConfig = {
  submissionId: WorkflowSubmissionId;
  maxConcurrency?: number;
  units: PreparedWorkflowUnit[];
  executeUnit: (
    unit: PreparedWorkflowUnit,
  ) => Promise<WorkflowExecutionUnitOutcome>;
};
```

The public registry indexes pending entries by `queueId`, backend, workflow, and input identity; consumers subscribe to narrow change events. Internal submission state additionally tracks FIFO order, active count, settled outcomes, and the submission completion resolver. Admitted entries leave the public pending index before backend/run records are created.

The existing `JobQueueManager` remains an execution-internal provider job queue. It may be simplified where scheduling responsibilities move upward, but it does not become the public Host queue SSOT.

Alternative considered: extend `JobQueueManager` with global lookup and cancel. Rejected because its records already mix provider progress, backend request identity, SkillRunner lifecycle repair, and terminal task projection. Making it the UI queue would preserve the exact coupling this change is intended to remove.

### 2. Use one independent FIFO and frozen limit per submission

Every confirmed trigger receives a new `submissionId`. The effective maximum is normalized once and stored on that submission controller:

- missing, blank, or `0` becomes `undefined` and admits every ready unit;
- a positive integer `N` admits at most `N` units from that submission at once;
- another submission of the same workflow has its own count and limit;
- later persisted-settings edits do not change an existing controller;
- order within a submission follows the prepared unit order.

The queue schedules a drain in a microtask after registration so all pending entries and subscriptions are established before admission begins. Unlimited submissions use the same controller with an effective limit equal to the unit count rather than bypassing the queue, preserving one cancellation and completion model.

Alternative considered: one global lane per `workflowId`. Rejected by product decision because users control each submission independently and duplicate confirmation is the guard between overlapping submissions.

### 3. Make cancellation an atomic pending-only operation

`cancelQueuedWorkflowUnit(queueId)` succeeds only while the entry is still in the pending index. It atomically removes the entry from the FIFO, emits a queue removal event, records a local runtime log, and settles that unit as:

```ts
{
  status: "skipped";
  reasonCode: "host-queue-canceled";
}
```

It does not create a backend request, task record, ACP owner, SkillRunner run, canceled terminal record, or Dashboard history row. A cancel racing with admission has exactly one winner:

- if removal wins, `executeUnit` is never called;
- if admission wins, Host queue cancel returns not-found/not-pending and the UI transitions to the normal backend-run controls.

Submission feedback counts this outcome as skipped. Queue cancellation is not routed through ACP or SkillRunner cancellation APIs.

Alternative considered: create a local canceled task for audit. Rejected because the user canceled work before it became a task; runtime logs provide diagnostics without polluting backend task history.

### 4. Introduce explicit prepared execution units

Replace the implicit assumption that one flat request equals one selectable input with an explicit request-build plan:

```ts
type WorkflowRequestBuildPlan = {
  units: PreparedWorkflowUnit[];
  stats: {
    totalUnits: number;
    executableUnits: number;
    skippedUnits: number;
  };
};

type PreparedWorkflowUnit = {
  unitId: string;
  order: number;
  taskName: string;
  inputUnitIdentity?: string;
  targetParentID?: number;
  requests: unknown[];
  preflight: WorkflowUnitPreflightState;
};
```

The workflow runtime creates one unit for each declaratively scoped selection context. Preflight outcomes remain inside that unit:

- `continue` produces one request;
- `expand` produces multiple child requests plus unit-local aggregate metadata;
- `short-circuit-apply` produces Host apply work with no provider request;
- `skip` omits the unit and increments skipped statistics.

Preparation passes the typed unit plan to duplicate guard and execution instead of reconstructing unit identity from a flat request array. Flat request lists may still be derived inside an admitted unit for the existing run/apply seams, but they are not the admission SSOT.

Alternative considered: throttle flattened requests. Rejected because a sequence or aggregate expansion could consume multiple slots, release a slot before aggregate apply, or allow work from the same execution unit to straddle unrelated units.

### 5. Execute and apply one admitted unit before releasing its slot

Extract an execution-unit orchestration function from the current trigger-level flow:

```text
executePreparedWorkflowUnit
  -> run unit requests
  -> await opaque terminal completion
  -> apply unit results/aggregate/short-circuit work
  -> return one unit outcome
```

The run seam returns an opaque terminal-completion promise or handle. Provider/run owners settle it when the unit is terminal; the Host queue never switches on ACP/SkillRunner status strings. `waiting_user` and `waiting_auth` therefore keep the promise and queue slot pending. Sequence workflows expose one outer completion that spans all steps and any declared step apply work. Final Host apply remains inside `executePreparedWorkflowUnit`, so apply failure is a failed unit and releases the slot only after its outcome is known.

The trigger-level orchestration emits one start notification for all accepted units, awaits the submission controller, merges succeeded/failed/skipped unit outcomes, and emits one final summary. Failure of one admitted unit releases its slot and does not block later FIFO entries.

Alternative considered: release on provider dispatch idle and apply after the whole batch. Rejected because it would start later units while an earlier unit is still waiting or applying, contrary to the selected concurrency semantics.

### 6. Preserve provider-internal concurrency inside a unit

The Host maximum limits execution units, not child provider requests created by one unit. Once admitted:

- a normal unit usually contains one provider request;
- a SkillRunner/ACP sequence continues to serialize according to its sequence contract;
- preflight-expanded aggregate children use the existing provider-specific internal dispatch policy;
- pass-through and Generic HTTP never enter this Host admission service.

With no maximum, all top-level ACP and SkillRunner units are admitted. This intentionally changes ACP multi-unit default admission from frontend serialization to unlimited. Persisting `1` restores serialized workflow-unit admission.

The existing full-parallel execution requirement is revised to distinguish top-level Host admission from provider-internal request dispatch.

### 7. Keep the queue memory-only and settle shutdown deterministically

The registry does not write queue entries to prefs, runtime files, task persistence, or workflow settings beyond the reusable maximum-concurrency default. Plugin shutdown:

- stops new admission;
- removes pending entries from observable indexes;
- settles pending unit promises as skipped with an internal shutdown reason;
- suppresses new user-facing completion notifications during teardown;
- leaves already admitted backend work to existing shutdown/recovery owners.

No startup scan or recovery schema is introduced.

Alternative considered: persist prepared requests. Rejected because recovery would need workflow/package version pinning, preflight context serialization, stale Zotero item/file validation, backend profile reconciliation, and apply ownership recovery.

### 8. Store concurrency as a Host option, not a provider runtime option

Extend `WorkflowExecutionOptions` with:

```ts
hostOptions?: {
  queue?: {
    maxConcurrency?: number;
  };
};
```

Normalization accepts only finite non-negative integers. `0` and blank remove the effective limit; positive integers remain. Negative, fractional, non-finite, and non-numeric values are invalid in the form and are not silently truncated by the domain.

The settings document advances to schema version 2. The domain reads existing version-1 and legacy flat records, normalizes absent `hostOptions` to no limit, and writes version 2. `updateWorkflowSettings()` continues to strip non-persistable `runOptions`, while normalized `hostOptions.queue.maxConcurrency` is persisted. Submit-time overrides merge through the same settings-domain parser. An explicit blank/`0` save removes a previously persisted maximum, so the write path retains field-presence intent until deletion is applied.

The effective Host option is removed before workflow hooks and provider request normalization unless a hook-facing execution contract explicitly needs the host snapshot. It is never serialized into backend `runtime_options`.

Alternative considered: add maximum concurrency to `providerOptions`. Rejected because the value is backend-independent Host scheduling policy and must not vary with provider schemas or reach backend payloads.

Alternative considered: add it to the existing Zotero Host Access `runOptions`. Rejected because that type is currently intentionally non-persistent and scoped to write approval; mixing persistence rules would obscure ownership.

### 9. Build one fixed availability preview per dialog

This change depends on `fix-parameterized-artifact-exclusion-phases`, which
defines availability/menu-mode selection independently from confirmed
execution-time exclusions. The queue change consumes that established boundary
and does not extend selection-filter semantics.

Before the submit dialog opens, build the selection context and call
`evaluateWorkflowSelection()` in availability/menu mode. Map each returned
scoped context to:

```ts
type WorkflowExecutionUnitPreview = {
  unitId: string;
  taskName: string;
  inputUnitIdentity?: string;
};
```

Task labels use the shared selection-based fallback logic, not `buildRequest` output. Preview construction MUST NOT invoke workflow preflight, `buildRequest`, provider, apply, duplicate confirmation, or Host admission.

The preview is calculated once while opening the dialog and remains fixed for
that dialog instance. Form edits do not alter it.

Confirmation runs full execute-mode preparation against the current selection
and confirmed settings. Existing preparation semantics may omit or expand
previewed candidates; omitted units never enter the Host queue or provider path
and retain their existing skipped accounting. If no executable units remain, no
queue controller is created. The list renders only when more than one
availability-valid unit exists. The maximum-concurrency control is part of that
multi-unit preview region and renders below the list; when the list is absent,
the control is absent as well. Persisted defaults are edited through the
existing save-workflow-defaults interaction on a multi-unit submission, not as
a standalone Dashboard workflow option.

At widths where the dialog renders its three visual columns side by side, the
outer multi-unit grid stretches both regions to the tallest column and the
nested workflow/provider grid consumes that height. The execution-unit preview
and workflow-option cards absorb any remaining vertical space, keeping the
maximum-concurrency and run-option cards compact at the bottom of their
columns. The responsive single-column layout resets those height constraints so
stacked cards retain their natural content height.

Alternative considered: run full preflight/build for an exact plan in the dialog. Rejected because it makes non-confirmed dialog interaction execute workflow hooks and can be expensive or behaviorally surprising.

### 10. Add source-level queue projections to ACP Skills and SkillRunner drawers

The queue registry publishes backend-filtered read DTOs. ACP Skills incorporates ACP queued entries into source-level owner navigation/drawer data without fabricating `AssistantWorkspaceOwner` values. SkillRunner incorporates SkillRunner queued entries into its drawer section builder without creating requestId-less run placeholders.

Both drawers use:

```text
Running
Queued
Completed
```

All three sections share one renderer and localized label source. Running is
expanded by default; Queued and Completed are collapsed by default. Each
section is independently collapsible. Running uses a subtle accent-blue
treatment, Queued uses a subtle warning-amber treatment, and Completed remains
neutral so failed or canceled terminal entries are not presented as successful.
The shared theme tokens provide the corresponding light and dark values.

The Queued section:

- is hidden when empty;
- groups entries by backend with independently collapsible groups;
- renders task name and workflow label;
- hides backend/apply status axes that would imply submission;
- disables the main row action;
- exposes one Material Icon cancel action carrying only `queueId`.

Section and group collapse state remain UI-local. ACP Skills and SkillRunner
use the canonical section ids `running`, `queued`, and `completed`; projection
layers preserve the complete section DTO instead of reconstructing only a
subset of its presentation fields. Cancel routing calls the Host queue service
and cannot reach ACP/SkillRunner run cancellation.

Alternative considered: project pending entries as requestId-less SkillRunner/ACP tasks. Rejected because current run selection, archive, details, transcript, and recovery contracts assume a real owner/run identity and would couple queue work to backend state.

### 11. Isolate queue-driven drawer rendering

Queue changes are source-level drawer changes. They update only the drawer/navigation DTO and drawer-specific stable signature. Queue revision, pending count, task names, and collapse state do not enter transcript, toolbar, banner, plan, hint, reply, details, permission, or Runner-pane signatures.

The shared drawer renderer generalizes section collapse handling beyond `Completed`, adds a registered cancel icon/action, and reconciles queued section/group/task keys. Queue-only tests retain element identity for every unrelated managed region and for unchanged drawer sections.

### 12. Add queued rows only to selected ACP/SkillRunner backend tabs

Dashboard refresh reads Host queue entries only when an ACP or SkillRunner backend tab is selected. Queue rows are mapped to a backend-table DTO with:

- `queueId` and no requestId/runKey/jobId;
- task/workflow/backend labels;
- Host `queued` state label;
- created/update time;
- no open/select row action;
- a pending-only cancel icon action.

ACP backend rows merge ACP run rows with ACP queued rows. SkillRunner backend rows merge run/history rows with SkillRunner queued rows. Queue ordering is stable by submission creation/unit order; ordinary run/history ordering retains its existing contract.

Dashboard Home, summary counters, active task reads, toolbar popover hooks, history persistence, and completed rows do not import or query the queue registry. Queue change events refresh a visible matching backend tab but do not refresh unrelated tabs or rebuild stable Dashboard chrome.

### 13. Extend duplicate guard with pending Host identities

Duplicate guard receives one combined candidate read:

```text
active workflow task identities
  + Host queued workflow unit identities
```

The existing key remains `workflowId + inputUnitIdentity`. Host queued matches enter the existing per-candidate serialized confirmation flow. Refusal produces the existing skipped duplicate outcome; explicit approval allows the unit into the new submission queue. A queued entry canceled before the decision completes is rechecked before presenting or applying the conflict so stale queue snapshots do not force a false confirmation.

The queue remains outside `taskRuntime`; duplicate guard depends on a narrow queue identity query rather than broad task projection coupling.

### 14. Use subscription-driven observation and bounded indexes

The queue registry emits typed add/remove/reset events. ACP Skills, SkillRunner, and Dashboard hosts subscribe only while their existing runtime owners are active and request backend-scoped snapshots. No polling timer is added.

Indexes support:

- lookup/cancel by `queueId`;
- list by backend type/id;
- duplicate candidate lookup by workflow/input identity;
- reset on shutdown/tests.

Raw prepared requests, selection contexts, provider credentials, and runtime options are not exposed in UI snapshots or queue diagnostics.

### 15. Test stable observable behavior rather than implementation order

TDD coverage is organized around public contracts:

- settings normalization, persistence clearing, version-1 reads/version-2 writes, and backend payload exclusion;
- declarative preview units and proof that hooks are not called;
- FIFO admission, independent submissions, fixed limits, unlimited admission, failure progression, pending cancellation, and cancellation/admission races;
- sequence/wait/apply completion holding a slot;
- preflight-expanded unit and aggregate apply preservation;
- duplicate confirmation against queued identities;
- absence of backend run/task/history records before admission;
- ACP and SkillRunner queued section grouping, collapse, disabled selection, and cancel routing;
- backend-tab inclusion plus Dashboard Home/popover exclusion;
- queue-only managed-region and DOM identity invariants.

Tests do not lock complete localized strings, timestamps, private callback order, or broad snapshots.

## Risks / Trade-offs

- [Execution-unit refactor can disturb preflight aggregate indexing] → Introduce the typed unit plan before scheduler work, retain unit-local request ordering, and extend existing aggregate behavior tests before changing admission.
- [Waiting runs can hold all slots indefinitely] → This is the chosen semantic; existing run cancel/reply/auth controls remain available, and pending queue cancel remains separate. Surface queued work clearly rather than adding an implicit timeout.
- [ACP unlimited default can launch more processes than before] → Make the behavior explicit in release notes and expose a persistable value of `1` as the direct serialized alternative.
- [Independent submissions can exceed a workflow-wide total] → This is intentional. Duplicate guard warns on the same workflow/input identity, while distinct inputs remain under user-controlled per-submission limits.
- [Declarative preview can differ from final preflight] → Label it as the current valid selection-unit list, rerun full preparation after confirmation, and keep preflight/build out of preview.
- [Selection changes while the dialog is open] → Full preparation after confirmation is authoritative; zero resulting units halts with existing no-valid-input feedback.
- [Cancellation and admission can race] → Make pending removal and admission one atomic state transition keyed by `queueId`; never attempt backend cancellation from the Host queue.
- [Queue UI accidentally becomes a third task state machine] → Expose only pending DTOs and add/remove events; remove entries before backend run creation and never retain admitted/terminal states in the queue read model.
- [Queue updates rebuild hot transcript surfaces] → Route changes through drawer-only DTO/signature paths and assert non-transcript DOM identity.
- [Settings schema migration loses old options] → Parse legacy flat and version-1 documents through the existing domain parser, add host options additively, and write version 2 only after normalized merge tests pass.
- [Plugin shutdown leaves execution promises unresolved] → Stop admission and deterministically settle pending unit promises as internal skipped outcomes while suppressing teardown notifications.

## Migration Plan

1. Add version-2 workflow settings parsing/writing with backward-compatible version-1 and legacy record reads; no eager rewrite is required.
2. Introduce execution-unit build contracts while preserving existing workflow outcomes and provider dispatch for unsupported backend types.
3. Add the Host queue service and route only ACP/SkillRunner interactive workflow submissions through it.
4. Add queue read projections and cancel routing to drawers and backend tabs.
5. Enable the multi-unit submit preview and its persisted maximum-concurrency editing after execution/UI contracts are present.
6. Ship without persisted queue data, startup recovery, or dependency changes.

Rollback removes Host admission routing and UI projections. Existing persisted `hostOptions` are additive and ignored by older code; backend data requires no migration or cleanup. Any pending in-memory entries disappear with plugin shutdown.

## Open Questions

None. Product decisions for submission scope, fixed limits, completion boundary, persistence, preview depth, provider scope, Dashboard cancellation, cancellation history, ACP unlimited default, and skipped feedback accounting are confirmed for this change.
