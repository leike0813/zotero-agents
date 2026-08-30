## Context

See `proposal.md` for motivation. The Rust sidecar is the production owner of Synthesis application and repository behavior. The TypeScript workflow adapter still exposes flat names that resemble the retired service boundary, and tag audit callers currently understand internal replacement/clear operations.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. Contract foundation supplies strict shared DTO and error rules. Canonical Synthesis packages remain the cross-language wire identity.

The authoritative architecture source is [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§8.5–8.6, 9, 10, 15.2, 17, 18, and 19. Its grouped member map, audit-run lifecycle, promotion and acknowledgement evidence, sidecar ownership, cancellation, cleanup, and parity requirements take precedence over abbreviated wording in this design.

## Goals / Non-Goals

**Goals:**

- Give workflows a grouped, explicit, fourteen-member projection.
- Close missing apply, staged-tag promotion, audit-run, and acknowledgement contracts across TypeScript and Rust.
- Hide durable run mechanics while preserving callback leverage and atomic promotion.
- Prepare one grouped implementation and a v11 delegating adapter without publishing a mixed Workflow Host surface.

**Non-Goals:**

- Exposing native RPC, repositories, lease/fencing, telemetry, or cleanup controls.
- Replacing typed reverse-Host ports or moving authorization into Synthesis.
- Deleting every legacy TypeScript Synthesis implementation in this change.
- Removing active v11 flat aliases before final Workflow Host activation.

## Decisions

### One explicit grouped adapter projects the canonical client

`src/modules/synthesisClient/workflowHostClient.ts` builds literal `workflowApply`, `topics`, `artifacts`, and `tags` objects from named adapter functions. It does not spread `SynthesisClient`, generate a catalog, or accept string dispatch. Client growth therefore remains private.

### Canonical contracts precede adapters

`packages/synthesis-contracts` defines the request/result DTOs used by the TypeScript client and Rust application. The change first closes `applyTopicPlan`, tag promotion, audit, and acknowledgement contracts, then updates both languages. A translation layer with independent DTO copies was rejected.

Successful Topic-plan persistence returns a canonical transaction receipt containing only its schema, opaque transaction identity, fixed `topic_plan.reconcile` operation, before/after graph hashes, and commit time. Non-persisting outcomes return `null`; repository records and operation telemetry remain internal.

### Audit callback hides the durable state machine

The Workflow adapter starts an internal run, supplies a writer whose append operations are bounded and run-scoped, receives the callback's library traversal terminal result, and asks the application to promote only completed evidence. All exit paths finalize or abort the run through one cleanup path.

`library.traverseItems` delivers a traversal-only `LibraryTraversalItemDto` that extends the regular summary with the Broker-owned canonical `tagDigest`. The tag auditor forwards that same-read digest as `auditedTagDigest`; ordinary item lists and selection summaries remain unchanged, and workflows never implement tag hashing.

The canonical package owns only strict-JSON audit DTOs. The trusted in-process `TagAuditRunWriter`, callback signature, traversal result, and raw Host mutation receipt wrapper remain in `src/workflows/types.ts`. Audit wire DTOs reuse `SynthesisHostItemRef`; the Host composition performs the single explicit mapping from `PortableItemRef.key` to `itemKey`.

Each append carries transient canonical `auditedTags` so the Rust application can independently validate the Host digest and the non-compliant-tag subset. Complete tags are validated in memory and are not persisted in staging.

### Promotion and acknowledgement use different evidence

Audit promotion requires complete traversal evidence and an unchanged staging basis. Regulation acknowledgement requires a process-valid Host mutation receipt and current active-row revision match. Neither receipt substitutes for the other.

Acknowledgement is an internal prepare/commit handshake. The Host pins and verifies the raw process-local receipt, native prepare binds the current active snapshot, the Broker fresh-reads revision and complete tags, and native commit performs snapshot/revision/vocabulary CAS. Only minimal verified JSON evidence crosses the native boundary; the raw receipt and private mutation delta never do.

Audit begin also resolves trusted execution identity per invocation. The candidate builder accepts a resolver for host-instance, package, workflow, and content identities and fails closed when it is absent. Runtime/loader binding is activated with the v12 hard cut rather than cached in the v11 Host singleton.

### Existing typed Host ports remain the reverse seam

The native application continues to depend on library-read, tag-effect, related-item, artifact, and delivery ports. Workflow Host composition is only the caller-facing projection and never becomes a transport callback registry.

## Risks / Trade-offs

- [Cross-language DTOs drift] → Generate or import both adapters from the canonical package and run parity tests at every new member.
- [Audit callback exits without cleanup] → Centralize success, rejection, cancellation, and Host-shutdown finalization around one run guard.
- [Flat and grouped behavior diverges before activation] → Delegate the eleven equivalent v11 calls to one grouped implementation. Keep `getTopicPlanningContext`, `replaceTagAuditRecords`, and `clearTagAuditRecord` as narrow invocation-late legacy passthroughs because their inputs cannot prove the v12 contracts; migrate and remove them atomically in `harden-workflow-host-api-v12`.
- [Receipt acknowledgement clears stale work] → Verify process scope, operation, target, audited/current revisions, and active-row identity in one transaction.
- [Sidecar internals leak for testability] → Use private application/repository seams and process integration tests rather than widening production interfaces.

## Migration Plan

1. Add failing canonical-package and TypeScript/Rust parity tests for the missing contracts.
2. Add the traversal-only tag-digest DTO and Broker serialization needed by the audit writer.
3. Implement canonical DTOs, transfer-plane routing for large public limits, and native application/repository behavior, including the v3-to-v4 derived-audit invalidation migration.
4. Build the explicit grouped Workflow adapter with invocation-late client resolution.
5. Implement callback-scoped audit lifecycle and receipt-bound acknowledgement.
6. Keep production callers on the active v11 projection; delegate the eleven equivalent members and retain the three v11-only passthroughs until `harden-workflow-host-api-v12` migrates callers and removes flat names.
7. Run canonical contract, Rust invariant, client, v11 regression, type/lint/build, and final project gates.

Rollback restores flat caller adapters while retaining any backward-neutral native contract additions. Durable staging created by incomplete runs is cleaned through the native owner.
