## Context

`legacyComposition.ts` is the only production consumer of the complete in-process service and injects the bounded Host read port. Related Items remains an active reverse Host write path used after Advanced Matching fact changes, reference proposal decisions, successful stale graph refresh, and explicit sync. Its private adapter accepts functions and falls back to `globalThis.Zotero`; the service currently mutates Zotero before persisting `pending_external_write`, contrary to the documented durable-effect ordering.

## Goals / Non-Goals

**Goals:**

- Make Related Items Host writes JSON-safe, bounded, semantic, and environment-neutral.
- Persist intended effects before Host IO and reconcile durable receipts after Host IO.
- Make ensure-present and ensure-absent idempotent across partial failure and explicit retry.
- Preserve user-existing relation ownership, Synthesis revoke provenance, operation progress, and notifier echo behavior.

**Non-Goals:**

- Migrate Topic mirror or staged-tag Host writes.
- Add Node, HTTP, timeout infrastructure, automatic startup Host reconciliation, or a new public command.
- Change repository schema, durable sync format, graph/reference algorithms, or UI behavior.

## Decisions

### 1. Use a dedicated Related Items effect port

`SynthesisHostRelatedItemsEffectPort.applyBatch()` accepts one to fifty effects. Each effect uses stable `{ libraryId, itemKey }` refs, a deterministic effect ID, `ensure_present` or `ensure_absent`, citation provenance, and a bounded permission context. The result contains exactly one receipt per effect with `applied`, `already_satisfied`, `not_found`, or `failed` plus structured diagnostics and a Host timestamp.

### 2. Validate and rebuild before Host access

The Zotero adapter rebuilds the canonical DTO, rejects non-JSON values, invalid refs, self-relations, unsupported actions, duplicate effect IDs, empty batches, and batches above fifty before resolving any Zotero item. Unknown JSON-safe fields are discarded. Missing items and mutation failures are per-effect receipts so one bad edge does not abort valid siblings.

### 3. Dispatch in durable batches

The application dispatches at most twenty-five effects per batch to preserve current progress/yield cadence. It snapshots prior effect rows, writes every plan in that batch as `pending_external_write`, exits repository writes, then invokes the Host. A transport throw or malformed receipt result stops later dispatch and leaves the current batch pending for explicit retry. Host IO never occurs inside a repository transaction.

### 4. Map receipts without losing provenance

Fresh ensure-present `applied` becomes `applied`, `createdBySynthesis=true`, and `awaiting_echo`; fresh `already_satisfied` becomes `already_existed`, `createdBySynthesis=false`, and `observed`. If a deterministic plan was already pending before this dispatch, `already_satisfied` recovers it as Synthesis-applied with a recovery diagnostic. Ensure-absent is generated only from a prior Synthesis-created effect; `applied` becomes `revoked`, and `already_satisfied` becomes `already_absent`. `not_found` becomes `needs_attention`; technical failure becomes `failed`.

Receipt reconciliation reloads the current row so an observer echo arriving between Host mutation and receipt persistence remains `observed` instead of being overwritten by `awaiting_echo`.

### 5. Keep recovery explicit

Startup does not execute Host writes. Interrupted pending rows remain durable. The next explicit or domain-triggered Related Items sync uses the same deterministic effect ID and idempotent ensure action to reconcile them. Existing relations without a prior pending Synthesis plan remain user-owned and are never revoked.

### 6. Composition owns Zotero

The production composition root constructs and injects the Zotero effect adapter. `service.ts` receives only the port, does not import its implementation, does not touch Zotero items for Related Items, and no longer accepts command-level Host function overrides. The readonly composition omits the port and retains the existing unavailable result.

## Risks / Trade-offs

- A process can stop after Zotero mutation but before receipt persistence. Deterministic pending plans and ensure semantics make retry idempotent; a prior pending row distinguishes interrupted Synthesis intent from a relation that predated the first dispatch.
- Batch transport failure leaves uncertain pending rows. Stopping later batches limits ambiguity, while explicit retry reconciles the affected batch.
- Not-found targets may later return. `needs_attention` preserves provenance and avoids silently claiming success or deleting user state.

## Migration Plan

1. Add failing contract, adapter, ordering, retry, echo-race, and boundary tests.
2. Add shared Related Items plan/receipt DTOs and the dedicated Host port.
3. Implement the Zotero adapter and inject it from default composition.
4. Replace direct Host orchestration with pending-plan and receipt reconciliation.
5. Update active docs and run focused, invariant, contract, boundary, and build gates.

No data migration is required. Existing effect rows are read by the same repository APIs and become retry inputs under the new orchestration.
