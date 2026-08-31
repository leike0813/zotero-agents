## Why

Workflow writes currently enter through handler-shaped and domain-specific paths that do not share operation identity, revision checks, preview evidence, receipts, attempts, or compensation semantics. V12 needs one canonical mutation authority so callers can reason about confirmed outcomes and recovery without seeing implementation primitives.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`; this change depends on `01-establish-workflow-host-v12-contract-foundation`.

Architecture source: [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§8, 11.3–11.17, 12.5–12.9, 15.2, 17, 18, and 19. The architecture record is authoritative for the closed operation union, revisions, preview tokens, idempotency, receipts, attempts, specialized owner boundaries, cleanup, and recovery semantics summarized here.

## What Changes

- Establish a process-local mutation registry with operation reservation, canonical request/plan digests, idempotent replay, revision/CAS, final-state verification, and bounded retention.
- Close generic execute over eleven operations and preview over three destructive operations with mandatory, caller-scoped, short-lived preview tokens.
- Return confirmed `committed`/`unchanged` receipts and structured `failed`/`canceled`/`unknown`/`repair_required` attempts after acceptance.
- Route note, payload, attachment, status-tag, item, relation, and collection writes through the same authority while retaining their domain-specific result DTOs.
- Make stored-attachment creation fail closed through complete prevalidation, managed staging, post-create copy, cleanup, and best-effort rollback.
- Keep handlers as internal mutation primitives rather than public or inferred capability sources.
- Prepare replacement operations internally; remove v11 public aliases and raw domains only during final activation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-capability-broker`: Make canonical mutation lifecycle and safe evidence Broker-owned while preserving explicit Workflow projection.
- `zotero-host-broker-capability-api`: Replace handler-shaped writes with closed execute/preview contracts, receipts, attempts, operation identity, CAS, and recovery.
- `custom-note-import-export`: Route note content, payload, embedded-image, and removal mutations through the canonical authority.
- `workflow-input-file-materialization`: Require attachment source and companion staging to complete before Zotero mutation and support bounded cleanup.

## Impact

- Broker, Workflow Host contract/adapters, handlers, note and attachment owner modules, status-tag consumers, and Synthesis receipt wiring.
- Tests: Broker mutation API, stored attachment, note image/payload, tag regulation, preview/token lifecycle, replay, conflict, unknown, repair, and compensation.
- No durable mutation ledger, cross-process replay, restore capability, generic warning bag, dependency change, or release action.
