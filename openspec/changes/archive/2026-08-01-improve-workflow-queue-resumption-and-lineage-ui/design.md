## Context

`WorkflowSubmissionQueue` currently increments one `active` counter when an execution callback starts and decrements it only when that callback settles. Interactive ACP/SkillRunner runs can remain alive while waiting for input, so execution lifetime and slot ownership are unintentionally coupled. Submission lineage already reaches task records as opaque IDs, while the Assistant Workspace already guards task-drawer rows with row-local signatures.

## Goals / Non-Goals

**Goals:**

- Model slot ownership independently from execution settlement with idempotent yield, priority reacquisition, and terminal cleanup.
- Make backend continuation and Host apply wait for reacquisition without interpreting provider-specific raw status strings in the queue.
- Freeze credential-free provider/model identity and one stable, non-numeric submission symbol at enqueue time.
- Reuse the existing ACP Skills and SkillRunner drawer rendering path and preserve all non-drawer DOM identities.

**Non-Goals:**

- Persisting or replaying the process-local Host queue.
- Introducing cross-submission fairness or a global concurrency pool.
- Blocking a backend that resumes autonomously before the Host observes it.
- Changing transcript stores, provider payload schemas, or Generic HTTP/pass-through dispatch.

## Decisions

1. Each queued unit keeps a long-lived execution state plus a separate slot state. Yield changes only slot state and the submission's held-slot count. Repeated yield, reacquire, cancellation, and settlement calls converge without decrementing below zero.
2. A submission owns two admission lanes: resumptions and initial FIFO work. The drain always selects the oldest requested resumption before the next initial unit. Submissions remain fully independent.
3. The execution context exposes a typed coordinator using normalized Host reasons. `runWithPrioritySlot` acquires before invoking a continuation callback; `ensureSlot` protects Host apply. Queue code never parses ACP or SkillRunner statuses.
4. Store safe presentation metadata on the submission controller. Provider/model values are normalized from the frozen execution context; all other provider options are discarded. A monotonic process-local ordinal maps to a base-eight symbol code: the first eight use one symbol and later ordinals use ordered multi-symbol codes.
5. Run projections carry submission display identity into one shared task-row decoration. The renderer places the symbol before the title, gives it equivalent tooltip and `aria-label` semantics, hides it for terminal tasks, and includes only those fields in the row signature.
6. Waiting/recovery observers yield through the typed coordinator. User reply, authorization, explicit retry, autonomous local continuation, and recovered apply use priority reacquisition. Cancellation remains callable without acquiring a slot and aborts an unsent queued continuation.

Alternatives considered: treating waiting as terminal would lose the unit outcome and lineage; creating a second generic job queue would duplicate admission state; encoding submission identity in the subtitle would collide with sequence numbering and couple identity to presentation text.

## Risks / Trade-offs

- [Backend resumes before local admission] → The Host cannot stop remote compute, but gates local continuation and apply and records the local unit as resumption-pending.
- [A continuation waits forever during shutdown] → Shutdown rejects pending slot waiters and prevents their callbacks from running.
- [Historical task records lack display metadata] → Decoration is process-local and shown only when the submission controller still exists; completed rows intentionally omit it.
- [Emoji rendering differs by platform] → The tooltip and `aria-label` carry the same provider/model semantics and symbols never encode task state.
- [Frequent queue changes destabilize the workspace] → Submission fields enter only task-row/drawer signatures; transcript and shared managed-region signatures remain unchanged.

## Migration Plan

No persisted-data migration is required. Land contracts and focused tests first, then queue coordination, seam integration, run projection, shared rendering/localization, and SSOT updates. Rollback removes the process-local coordinator and decoration fields without rewriting stored runs or transcripts.

## Open Questions

None.
