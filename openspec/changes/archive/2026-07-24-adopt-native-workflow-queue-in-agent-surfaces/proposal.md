## Why

The plugin now owns an ACP/SkillRunner workflow submission queue, but Host Bridge submissions still bypass it and the Hermes Zotero Librarian profile maintains a second durable plan-entry queue. External agents therefore observe and control a different admission lifecycle from the plugin UI, with competing queue identities, concurrency limits, and recovery rules.

## What Changes

- **BREAKING** Route Host Bridge ACP/SkillRunner workflow submissions through the plugin-owned prepared-unit submission queue and return an asynchronous submission handle instead of inventing run or job handles before admission.
- Add authenticated Host Bridge and CLI operations for queue listing, pending-unit cancellation, active submission inspection, and task lookup by submission.
- Add request-scoped `hostOptions.queue.maxConcurrency` without accepting client-supplied input plans or prepared units.
- Preserve Workflow Input Planning v2 as the sole raw-selection-to-prepared-unit planner and make the immutable prepared unit the shared UI/Host admission boundary.
- Remove the Hermes profile's durable `workflow_plans` / `workflow_plan_entries` admission state machine and its `workflow plan|submit` service commands while preserving live validation, operator authority, receipts, run supervision, notifications, attention, indexing, and read-only cron work.
- Rewrite the three agent-facing surfaces so exact queue commands remain in Minimum, bounded research-task selection remains in Generic, and resident supervision remains in Hermes.
- Add a pinned semantic-parity and relative materialized-depth gate. Except for the explicitly removed Hermes plan-entry queue instructions, existing Host Bridge guidance may not be compressed, deleted, or merged, and new guidance must have comparable procedural depth.
- Regenerate governed Host Bridge packages, documentation, and the Chinese ownership review mirror without publishing a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-host-queue-management`: Expose active submission and pending queue projections to Host Bridge while preserving prepared-unit admission semantics.
- `workflow-execution-seams`: Add one shared prepared-unit submission seam used by UI and Host Bridge.
- `workflow-duplicate-job-submission-guard`: Preserve immutable v2 group membership and member-wide duplicate identity through queued and admitted states.
- `workflow-input-planning-protocol`: Define the handoff from a confirmed v2 plan to Host admission without accepting remote plans or replanning.
- `host-bridge-workflow-control`: Add queued submission, queue cancellation, submission inspection, and submission-scoped task discovery.
- `host-bridge-cli-interface`: Add host options and queue/submission commands with generated exact command contracts.
- `host-bridge-service`: Route and authenticate the new queue and submission endpoints.
- `host-bridge-approval-prompts`: Keep submit approval before queue registration while allowing direct interactive cancellation of pending Host units.
- `host-bridge-operation-receipts`: Apply existing idempotency and receipt rules to pending queue cancellation.
- `host-bridge-agent-surfaces`: Preserve the pinned semantic baseline and enforce relative materialized instruction depth.
- `zotero-library-agent-bundle`: Add bounded-task handoff from confirmed input planning to Host-native admission without duplicating CLI facts.
- `zotero-librarian-profile`: Remove the profile-owned durable admission queue and adopt one-pass native submission observation.

## Impact

The change affects workflow execution seams, queue projections, task metadata, Host Bridge workflow/server contracts, Rust CLI commands, generated agent-surface descriptors, OpenSpec contracts, the Minimum/Generic/Hermes semantic sources, the Librarian resident service, and governed generated/review outputs. It does not change Input Planning v2 candidate or grouping algorithms, Generic HTTP/pass-through dispatch ownership, provider payload contracts, agent-owned workflow handoff/apply-back, release versions, publication workflows, or Gitee state.
