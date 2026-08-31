## Context

The queue root for `skillrunner.sequence.v1` is an orchestration carrier. Its `meta.requestId` is updated to the active concrete step, while each step owns a separate ACP or SkillRunner lifecycle record. The shared provider-terminal resolver currently gates failure and cancellation on root state, but falls through to the active step record while the root is still running. The terminal observer calls that resolver before checking the root, so a settled non-final step can complete the submission and bypass the later outer apply.

The sequence runtime already records `completed`, `failed`, and `canceled` correctly. The correction belongs at the workflow execution seams rather than in synthesis workflow definitions, ACP output validation, or UI state projection.

## Goals / Non-Goals

**Goals:**

- Make sequence root state the terminal eligibility gate in every workflow seam caller.
- Preserve foreground apply, deferred recovery, failure, cancellation, and short-circuit behavior.
- Keep ordinary ACP and SkillRunner jobs on their existing terminal paths.

**Non-Goals:**

- Changing ACP prompt or output-repair behavior.
- Adding workflow-, backend product-, agent-, or skill-specific conditions.
- Changing sequence persistence, request contracts, or Assistant Workspace rendering.

## Decisions

### Gate provider-terminal resolution on the sequence root

For a sequence request, the shared terminal resolver will return no outcome while root state is missing or non-terminal. Root failure and cancellation remain direct terminal outcomes. Only a completed root may redirect lookup to the last materialized step request.

This keeps short-circuit completion correct because the last materialized step is the actual terminal step. Using the declared `final_step_id` instead would fail when a valid short-circuit prevents that step from running.

### Gate terminal observation before local job facts

The run seam will reject terminal observation for a non-terminal sequence root before consulting provider records or queue job state. Once root eligibility is established, the shared resolver owns external terminal interpretation; the duplicated sequence-specific child lookup in the observer will be removed.

This explicit gate protects against ordering races even if a queue job publishes a terminal-looking child result before the root state update.

### Leave output convergence unchanged

Directly valid output and repaired valid output converge to the same ACP record shape: validation succeeded, prompt inactive, and apply pending. Workflow apply owns the transition from that state. The root-boundary regression test therefore remains repair-agnostic and reuses the existing end-to-end direct and repaired sequence-apply coverage.

## Risks / Trade-offs

- [A malformed sequence never records a root terminal state] → The workflow remains pending instead of falsely succeeding; existing failure and recovery paths must terminalize the root, and regression tests cover failure/cancellation.
- [Removing duplicate observer logic changes deferred recovery] → Cover completed-root terminal apply states for both ACP and SkillRunner, while retaining the shared resolver as the recovery source.
- [A short-circuit has no declared final-step record] → Resolve the last actually materialized request only after root completion.

## Migration Plan

No data migration is required. The change affects runtime interpretation of existing sequence and run records. Rollback consists of reverting the execution-seam changes and their contract updates.
