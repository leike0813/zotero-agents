## Context

See `proposal.md` for motivation. Current handlers provide useful internal Zotero mutation primitives, but public writes do not share one reservation, CAS, preview, receipt, attempt, verification, or recovery lifecycle. Notes and attachments also cross Zotero and filesystem boundaries where compensation can fail.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. Contract foundation change `01-establish-workflow-host-v12-contract-foundation` supplies portable refs, strict JSON, shared errors, and canonical public type rules. Runtime adaptation supplies managed file operations but does not own mutation semantics.

## Goals / Non-Goals

**Goals:**

- Put operation identity, CAS, actual-delta verification, receipts, attempts, and recovery behind one Broker seam.
- Make destructive preview complete and execute-bound.
- Reuse mutation lifecycle for named note, attachment, and status-tag modules.
- Represent partial, ambiguous, and residual outcomes honestly.

**Non-Goals:**

- A durable mutation database, cross-process replay/resume, or public epoch.
- Generic preview for low-risk writes, generic warning bags, or handler exposure.
- Restore operations, symmetric related-item operations, or annotation mutations.
- Removing active v11 names before atomic activation.

## Decisions

### A bounded process-local registry owns accepted operations

Reservation keys include trusted caller scope and `operationId`; records bind a canonical request digest and terminal outcome. Concurrent identical submissions wait for or reuse the same operation. Conflicting digests fail closed. Records expire by time and capacity and disappear on Host restart.

A durable ledger was rejected because v12 requires process-local idempotency and final-state verification, not cross-process execution recovery.

### One canonicalization source serves requests, plans, and effects

Operation-specific normalization produces request digests, preview plan digests, final comparisons, receipt changes, and effect digests. Preview-token random bytes are excluded from semantic request identity. This prevents equivalent re-preview from becoming a false conflict and prevents mismatched planning from bypassing validation.

### Only destructive operations require preview tokens

Type conversion, permanent item removal, and collection removal expose complete plans and observations. The token has a fixed fifteen-minute TTL, is reusable only while bound state remains current, and is invalid after restart. Other operations use reads, optional/required revisions, and confirmed execute outcomes.

### Accepted operations return results rather than losing evidence in throws

Before reservation, validation and capability failures use the shared error contract. After reservation, terminal outcomes are `committed`, `unchanged`, `failed`, `canceled`, `unknown`, or `repair_required`. The first lifecycle failure is primary; cleanup issues remain secondary.

### Specialized modules share authority without becoming generic operations

Notes, payloads, attachments, and status tags use named interfaces and domain DTOs. Internally they reserve and finalize through the same authority. Their unique staging and compensation remain in their deep modules rather than expanding the eleven-operation union.

### Handlers remain implementation primitives

Existing handler functions may be reused behind the Broker, but no spread, inferred registry, or handler-shaped alias enters Workflow Host. Handler tests that lock internal order are replaced by Broker or named-module interface tests.

## Risks / Trade-offs

- [Process crashes after an uncertain write] → Invalidate receipts/tokens on restart and require fresh read/reconciliation; never promise replay.
- [Registry retains large results] → Enforce operation, target, serialized-result, TTL, and capacity bounds.
- [Compensation obscures the primary failure] → Store primary failure once and append bounded secondary cleanup issues.
- [Specialized modules duplicate lifecycle] → Centralize reservation/finalization and test receipt/attempt parity across modules.
- [V11 consumers break during preparation] → Stage new owners and adapters while retaining old public projection until activation.

## Migration Plan

1. Add failing tests for reservation, same/different replay, revisions, three previews, token expiry/restart, receipts, attempts, unknown, and repair.
2. Implement canonicalization, bounded registry, preview-token, final verification, and evidence types in the Broker owner.
3. Route the eleven generic operations through the authority.
4. Route notes, payloads, attachments, prepared images, and status tags through shared admission/finalization.
5. Migrate internal consumers and remove duplicate lifecycle logic while preserving v11 projection.
6. Run focused mutation, workflow, Zotero, type, lint, build, and strict OpenSpec gates.

Rollback reverses the staged authority and adapters together. No mutation ledger or user-library schema is introduced.
