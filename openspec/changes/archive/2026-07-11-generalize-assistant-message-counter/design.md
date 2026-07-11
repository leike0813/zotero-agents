## Context

The existing execution progress tracker counts only Assistant semantic segments, exposes them only during active silent work, and renders a progress node inside the transcript container. Transcript pages and indexes cannot supply complete category totals because silent mode suppresses process events before transcript persistence. The shared Assistant renderer already isolates panel chrome into managed regions, so the counter can become a peer region with its own signature.

## Goals / Non-Goals

**Goals:**

- Maintain Assistant, Thought, and Tool counts from protocol-semantic events before display projection.
- Expose current user execution and selected-owner cumulative totals across all three panels and modes.
- Persist complete owner summaries without gating cold transcript page rendering on full mirror hydration.
- Render one compact localized counter row with region-level DOM identity protection.
- Localize the transcript Assistant role through the shared label SSOT.

**Non-Goals:**

- Counting user, plan, status, permission, usage, or workspace-activity rows.
- Changing transcript JSONL/index schemas or reconstructing suppressed legacy events.
- Resetting current counts for automatic repair/retry attempts.

## Decisions

1. Add a shared message-count state with `current` and `cumulative` triplets, owner/execution identity, activity, revision, and completeness. Assistant/Thought increment at the start of a semantic segment; a new Tool call increments once by canonical identity; updates and soft side channels do not increment.
2. Update counts before execution-display gating. Silent suppression therefore affects transcript visibility and persistence but not message-count truth.
3. Begin a new current execution only for a user-originated prompt/run or explicit user retry. Finishing marks the state inactive but preserves both triplets; deleting the owner releases it.
4. Persist the summary in existing ACP Chat conversation, ACP Skills run, and SkillRunner task/run metadata. The transcript writer and index remain unchanged. Remote SkillRunner owners use the existing plugin-owned task state keyed by backend and task identity.
5. Treat missing legacy metadata as `unavailable`: current activity can still be shown, but the cumulative denominator is omitted. The system does not scan transcript pages or present a lower bound as a complete total.
6. Introduce a `messageCounter` managed region between banner and main/transcript. Its signature contains only owner, count DTO, visibility, and localized labels. Transcript rendering no longer owns or keys on progress.
7. Reuse one Fluent-backed Assistant label in the counter and canonical message metadata. Unknown protocol roles retain their raw fallback.

## Risks / Trade-offs

- Legacy owners cannot recover suppressed silent events → omit their cumulative denominator instead of fabricating history.
- High-frequency protocol chunks could over-publish snapshots → increment revision only on new semantic segments/calls and preserve existing publication cadence.
- SkillRunner process identities are inconsistent → normalize Assistant replacement and Tool/Thought identities before counting and reuse that identity for merge/deduplication.
- A new managed region can accidentally join panel-wide render keys → test count-only updates against toolbar, banner, transcript, reply, plan, and drawer DOM identity.

