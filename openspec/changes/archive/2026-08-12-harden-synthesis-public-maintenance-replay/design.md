## Context

Public maintenance receipts already persist a canonical source hash and use `INSERT OR IGNORE`, but operation identity also hashes `acceptedAt`, and the insert API does not report whether the current call created the row. Startup has two competing owners: repository open cancels all running rows, then the runtime scans only the newest 1,000 rows and applies public-maintenance-specific policy.

## Goals / Non-Goals

**Goals:**

- Make receipt creation, worker ownership, Host effects, autosync maintenance epochs, and lifecycle events one atomic first-insert decision.
- Give startup reconciliation one application-level owner and stable bounded traversal.
- Preserve existing receipts, operation prefixes, retry successor behavior, and wire surfaces.

**Non-Goals:**

- Add a general response cache for inline operations or a new user-supplied idempotency field.
- Automatically replay interrupted work or infer whether an external effect completed.
- Address transfer ownership, WebDAV state races, application parity, performance fixtures, or desktop smoke.

## Decisions

### 1. Identity hashes stable request and semantic basis

The operation ID continues to use the existing capability prefix and 24-hex digest suffix, but the digest input is `{requestId, capability, sourceHash}`. `sourceHash` remains the canonical hash of capability plus argument values. Acceptance time remains receipt metadata only.

Using request ID alone was rejected because it would collapse a reused transport identity across different semantic requests. Hashing only the payload was rejected because separate user requests for the same maintenance action are allowed to create distinct operations.

### 2. Durable insertion returns whether the caller won ownership

The repository insert returns both the stored row and whether SQLite inserted it. The begin layer publishes `maintenance-started` only for the winner, and the production client returns immediately for a replay before acquiring autosync ownership or spawning a thread. A stored row whose operation type, basis kind, or source hash conflicts with the computed identity fails closed with the existing `basis_mismatch` wire error.

A pre-read followed by insert was rejected because it splits the ownership decision. An in-memory replay map was rejected because replay safety must survive process restart.

### 3. Runtime reconciliation owns restart policy

Repository open no longer mutates operation rows. The existing explicit runtime startup boundary performs two stable keyset scans: all running rows, and pending public-maintenance rows. Public running receipts become failed because an external effect may have happened; other running rows retain the stale-canceled behavior. Public pending receipts require continuation.

Offset pagination was rejected because updating status and timestamps while scanning can shift later pages. Loading all identities was rejected because startup memory would become unbounded.

## Risks / Trade-offs

- [A truncated digest could collide] -> The stored operation type, basis kind, and full source hash are verified before treating a row as replay.
- [Large restart sets take multiple transactions] -> Every row transition is idempotent; a later startup continues from durable state after a partial failure.
- [Repository reopen behavior changes internally] -> The production service already invokes explicit reconciliation before accepting requests, and tests lock both repository purity and ready-before-surface classification.

## Migration Plan

No schema or receipt migration is required. Existing operation IDs remain queryable and are reconciled by their stored basis kind. Rollback restores the old runtime code without changing durable formats.
