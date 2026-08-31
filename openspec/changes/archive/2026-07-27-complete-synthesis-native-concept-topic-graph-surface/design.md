## Context

This change owns the nine Concept KB and Topic Graph operations in the parent matrix. Existing typed applications use explicit basis hashes and full-field update commands that do not directly match every public method.

## Goals / Non-Goals

**Goals:**

- Preserve public Concept query/update/delete/review and Topic Graph relation/review/rebuild DTOs.
- Derive internal basis and unchanged fields inside the compatibility boundary.
- Persist deterministic indexes and review state with restart evidence.

**Non-Goals:**

- Topic report/Workbench behavior or canonical-reference review.
- Requiring public callers to understand internal CAS shapes.
- Production activation.

## Decisions

### Translate public patches into typed CAS commands

The compatibility adapter reads one coherent aggregate, derives its manifest/basis, merges unchanged fields, and submits the typed application command. Public requests stay stable while internal applications retain explicit concurrency control.

### Keep Concept and Topic Graph policies distinct

Shared compatibility helpers may normalize envelopes and stable errors, but Concept review actions cannot stand in for Topic Graph relation actions or vice versa. Each operation has a dedicated typed path.

### Verify deterministic reopen behavior

Fixtures compare query ordering, normalized display text, deletion, review state, relation indexes, stale-basis failures, rebuild results, and reopened durable state before roster admission.

## Risks / Trade-offs

- [Read-derive-write races] → Submit the captured basis and fail as conflict if state changed.
- [Shared adapters blur domain policy] → Share only envelope/error mechanics; keep handlers domain-specific.
- [Index bytes differ while DTOs match] → Compare both public results and canonicalized durable manifests.
