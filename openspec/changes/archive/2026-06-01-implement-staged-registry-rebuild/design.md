## Context

Incremental Registry updates already mutate runtime DB state, but full rebuilds
need stronger protection because they can replace a large basis at once. The
latest design requires staged candidate state and short promotion transactions.

## Goals / Non-Goals

**Goals:**

- Promote full rebuild output only after validation passes.
- Keep previous active Registry basis readable on build/validation failure.
- Keep last-known-good basis available for explicit rollback.
- Avoid marking topic source-check changed from Registry rebuild alone.

**Non-Goals:**

- No conversion of normal incremental updates into full rebuilds.
- No automatic promotion of suspicious candidates.
- No automatic topic artifact rewriting.

## Decisions

- Registry basis metadata includes active epoch, last-known-good epoch, and run
  status.
- Candidate rebuild writes staging rows or a candidate state isolated from
  active reads.
- Validation failure keeps active epoch unchanged.
- Suspicious but structurally valid candidates require explicit dangerous
  confirmation before promotion.
- Rollback repoints active basis to last-known-good and enqueues graph rebuild.

## Risks / Trade-offs

- Full staging may require extra storage. This is acceptable because full rebuild
  is an explicit repair path, not the default hot path.
