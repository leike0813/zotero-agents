## Context

Running workers may finish after Registry basis changes. The system cannot
cancel them reliably, so correctness must be enforced at repository promotion.

## Goals / Non-Goals

**Goals:**

- Prevent stale worker output from becoming visible.
- Preserve latest active graph/metrics/layout while stale output is discarded.
- Mark stale work as superseded in dirty event and job state.
- Keep Workbench reads on active rows only.

**Non-Goals:**

- No physical async cancellation.
- No distributed locks.
- No long compute inside write transactions.

## Decisions

- Worker start captures current active Registry basis.
- Intermediate output is scoped by `run_id` and basis or held in staging state.
- Final promotion transaction rereads active basis.
- Basis mismatch marks run/event/job superseded and does not change active
  pointers.
- Basis match atomically promotes the run by swapping active pointer or copying
  staged rows into active rows.

## Risks / Trade-offs

- Staging adds implementation complexity, but it is the only reliable guard
  against late stale commits in this runtime model.
