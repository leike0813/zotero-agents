## Context

Workflow Input Planning v2 now produces immutable top-level prepared units and makes those units the duplicate-confirmation and Host queue boundary. The plugin UI already admits ACP/SkillRunner units through `WorkflowSubmissionQueue`, but Host Bridge still flattens all allowed units into one batch execution and returns a synchronous `workflowRunId` / `jobIds` result. The Hermes profile additionally persists its own plan-entry backlog and launches entries in operator-sized batches.

The change must preserve the complete e63 planning protocol, member-wide duplicate identity, provider ownership, agent-owned handoff/apply-back, and every unaffected agent-facing semantic unit. It must also keep queued state process-local and avoid exposing selection payloads or member identities.

## Goals / Non-Goals

**Goals:**

- Give UI and Host Bridge one prepared-unit submission seam and one ACP/SkillRunner admission queue.
- Return a truthful submission handle before backend run/job identities exist.
- Provide a continuous active projection from pending queue entries through admitted units to concrete task/run handles.
- Remove Hermes-owned pending-entry persistence and replay decisions without weakening its authority, evidence, monitoring, or recovery guidance.
- Preserve Input Planning v2 and the e63 Host Bridge semantic baseline without compression.
- Keep exact CLI facts, bounded research-task policy, and resident automation policy in their declared layers.

**Non-Goals:**

- Replanning raw selection downstream, accepting remote prepared units, or changing v2 grouping.
- Queueing Generic HTTP/pass-through or agent-owned workflow handoff.
- Persistent queue history, pause/resume/retry/reorder, or bulk cancellation.
- Deleting old Librarian plan tables/files from existing state.
- Publishing, selecting release versions, dispatching Host Bridge release, or syncing Gitee.

## Decisions

### 1. Admit immutable prepared units through one deep seam

Add `workflowExecution/submissionSeam.ts` with one entrypoint that receives the resolved `PreparedWorkflowExecution`, duplicate-approved `PreparedWorkflowUnit[]`, and initial outcomes. It never accepts raw selection or built provider requests.

For each admitted unit it performs build/preflight, run, terminal wait, and apply before releasing the queue slot. UI awaits the completion summary; Host Bridge returns immediately after registration. Generic HTTP and pass-through retain their current direct dispatch branch inside the same seam.

This avoids putting admission into `runSeam.ts`, whose job queue begins after provider requests exist, and prevents Host Bridge from maintaining a second orchestration implementation.

### 2. Evolve the Host submit result by admission mode

ACP/SkillRunner submit returns HTTP `202` with:

- `admission: "host-queue"`
- `submissionId`
- workflow/backend identity
- accepted, initially skipped, and total unit counts
- normalized queue concurrency
- permission outcome and submission status URL

It does not expose `workflowRunId` or `jobIds` before admission. Generic HTTP/pass-through retains the synchronous result under `admission: "direct"`.

This intentionally narrows the e63 “stable return DTO” requirement to stability within each discriminated branch. Preallocating fake run/job handles was rejected because pending units are not backend tasks and the queue specification forbids them from entering task history.

### 3. Keep a process-local active submission projection

`WorkflowSubmissionQueue` already owns submission controllers. Extend each active controller with immutable pending/admitted unit snapshots and lifecycle counts. Host control composes that projection with existing task records by `submissionId`.

The public active projection contains only safe labels, member counts, opaque unit IDs, states, and cancellation capability. Member identities, raw selection, provider credentials, and request payloads remain private.

Completed task/run history remains the durable runtime evidence. The active submission projection disappears after completion or restart; no new persistence store is introduced.

### 4. Carry submission lineage as Host-only metadata

The submission seam passes `{submissionId, submissionUnitId, inputUnitIdentity}` to `runWorkflowExecutionSeam`. Job/task metadata persists the two opaque submission handles and uses the prepared unit identity as the primary source identity. Member identity lists remain internal and are not projected to Host Bridge DTOs.

This lets `/tasks?submissionId=` bridge admitted units to concrete run handles without polluting provider payloads.

### 5. Keep queue concurrency in Host options

Add top-level submit `hostOptions`, parsed by the existing strict workflow host-options normalizer. The canonical field is `hostOptions.queue.maxConcurrency`; absent or zero means unlimited and a positive safe integer freezes the per-submission limit.

CLI accepts `--host-options` JSON/file input. A scalar `--concurrency` alias was rejected because it would duplicate the schema owner and recreate the Hermes batching model.

### 6. Cancel only pending units

Queue list is read-only. Queue cancel uses a queue ID, never a run ID, and returns the native `canceled | not-pending` union. Syntactically valid missing/admitted/settled IDs return `not-pending`, which makes the admission race idempotent.

The request participates in the existing operation-receipt system but does not open Zotero approval: cancellation cannot reach a provider or mutate Zotero. Hermes interactive agents may cancel; resident cron may only observe.

### 7. Remove only the Hermes admission backlog

Delete the profile service's workflow-plan tables, entry reservation/state machine, plan files as executable input, `workflow plan|submit`, `--allow-submit`, and entry-batch concurrency. Existing old tables/files are ignored and left untouched.

The interactive current-state path becomes live describe/validate, freeze raw selection for the authorized request, submit once through inherited CLI, inspect the active submission, then register/watch concrete run handles. Notifications, watched runs, attention, index/catalog, maintenance, receipts, and read-only cron remain.

### 8. Make semantic preservation and relative depth blocking gates

Pin e63 in `semantic-parity.md`. Every affected baseline meaning receives one current owner and a preservation disposition. Only the enumerated Hermes plan-entry meanings may be marked `explicit-deletion`.

Extend the existing package validator with optional baseline materialization comparison. For each same-path governed Markdown file, current substantive lines must not fall below baseline and normalized prose must remain at least 95 percent. These metrics are regression alarms, not semantic proof; zero unmapped/downgraded/duplicate counts remain mandatory.

## Risks / Trade-offs

- [Queued submit no longer has immediate run/job handles] → Return a submission handle, active submission URL, and task filter; never synthesize backend identity.
- [Admission can precede task registration] → Retain admitted units in the active in-memory projection until concrete tasks appear or execution settles.
- [Restart loses pending units] → Document process-local expiry and require resubmission from current live Zotero state; never replay old Hermes entries.
- [Surface rewrite accidentally drops e63 planning guidance] → Pin e63, inventory every affected semantic unit, and run per-file relative depth gates before rendering.
- [Line metrics can reward filler] → Require semantic parity, one normative owner, duplicate checks, and human review in addition to metrics.
- [Old SQLite tables remain] → Remove all read/write/command paths while leaving bytes inert to avoid destructive migration.

## Migration Plan

1. Add OpenSpec deltas, the e63 parity matrix, and failing seam/API/profile/governance tests.
2. Add the shared submission seam and move UI/Host queue-managed execution into it.
3. Add Host queue/submission routes, task lineage, host options, CLI commands, and descriptor facts.
4. Remove Hermes external admission state and update source guidance at equal or greater depth.
5. Run focused tests and semantic/depth review against e63.
6. Render generated surfaces, refresh the review mirror, and run content/package checks.

Rollback before publication reverts this coordinated change. Partial rollback is unsupported because restoring the Host Bridge bypass or Hermes backlog would recreate multiple queue owners.

## Open Questions

None.
