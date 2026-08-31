## Context

Production Advanced Reference Matching is an explicit plugin-owned operation. It materializes current Zotero item summaries, captures active raw references/canonicals/redirects/bindings, executes the shared matcher engine's binding and canonical-dedupe passes outside the repository lock, recaptures Host and repository bases, and promotes accepted facts plus review proposals transactionally. Review actions live in the same plugin service and mutate proposal status together with deterministic binding or redirect facts before triggering separate graph and related-items effects.

The sidecar now owns an isolated Reference Refresh projection but has no matching/review application. Copying production proposal rows, state transitions, and promotion rules would create parity drift. The private foundation therefore extracts environment-neutral contracts, repository facts, and application rules while retaining production ownership and effects.

## Goals / Non-Goals

**Goals:**

- Add strict private matching/review DTOs, bounded reads, two-stage matching, stable results, and lifecycle semantics.
- Persist proposals, preparation receipts, matching state, and review-derived facts in the isolated repository.
- Execute both existing matcher engine passes outside SQLite and promote only after Host and reference bases are reconfirmed.
- Preserve rejected-basis suppression and the complete production proposal lifecycle, including logical delete and manual retargeting.
- Consolidate proposal rows, DDL, CRUD, basis hashes, state transitions, fact provenance, and graph-delta calculation as shared sources of truth.
- Keep production behavior compatible while the private application remains disconnected from production routing and effects.

**Non-Goals:**

- Matcher algorithm, threshold, danger-pair, normalization, clustering, or evaluation-policy changes.
- Public RPC/HTTP, Host callback routing, automatic invocation, paged/streaming large-library transport, UI, or preferences.
- Citation Graph execution, layout, related-items effects, production persistence/canonical ownership, repair, WS6 canary, or WS7 cutover.
- Canonical metadata/archive maintenance or generic non-reference review actions.

## Decisions

### Use a two-stage preparation/apply protocol

`prepareMatching` receives an expected active reference hash and one strict, bounded materialized Zotero-item snapshot. It canonical-hashes the snapshot, captures repository matching facts, runs `matchBindings` and `dedupeCanonicals` outside SQLite, and retains one single-use in-memory preparation while recording a durable operation receipt. `applyMatching` receives the preparation id and a recaptured Host-basis hash. Promotion requires both the Host hash and active reference hash to match the preparation.

This lets a future Host adapter recapture current Zotero state without granting the private sidecar a callback or widening the service protocol. A one-shot method was rejected because it could not distinguish a stale Host materialization after long matcher compute.

### Share proposal and review facts, not production effects

Shared repository/application packages own strict proposal rows, DDL, CRUD, deterministic proposal/binding identifiers, rejected-basis checks, matching projection, status transitions, accepted-fact commands/revocation decisions, manual audit proposals, and bounded graph-fact deltas. Designated persistence adapters execute the commands transactionally. The plugin repository delegates proposal persistence to the shared repository facts and the plugin service remains the production orchestrator for progress, graph incremental refresh, and related-items sync.

The private application persists the same facts but only marks its graph and related projections stale. It never calls Host, graph, layout, or related-items effect code.

### Preserve the complete current proposal state machine

Proposal kinds remain `zotero_binding` and `canonical_merge`. States remain `open`, `accepted`, `rejected`, `superseded`, and `retargeted`; delete is logical supersession. Actions remain accept, reverse accept for canonical merges, reject, reopen, delete, and manual target. Accept creates the deterministic binding/redirect fact in the same transaction as the status transition. Reject, reopen, delete, or retarget revoke an accepted fact before changing status. A manual target creates an audit proposal and marks the original proposal retargeted.

Batch review preserves current partial-success behavior: each decision is atomic, invalid decisions produce bounded structured results, and successful decisions are not rolled back by later failures.

### Keep matching precision and rejected decisions unchanged

The binding pass automatically persists only matched deterministic/high results. Suggested or ambiguous candidates are capped by the existing engine contract and become proposals. The dedupe pass persists only engine `redirect` actions; review actions become canonical-merge proposals. Rejected proposals suppress regeneration only for the same kind, basis hash, and source hash.

### Serialize matching/review mutations and keep reads available

One application instance admits one preparation, apply, or review mutation. Competitors fail immediately as `reference_matching_busy`. Reads remain repository-backed and responsive. Discard/apply consumes the preparation. Shutdown stops admission, discards preparation, drains active work, and then allows repository closure.

## Risks / Trade-offs

- [Materialized library snapshots can exceed the current service wire] -> Keep the application private, enforce existing matcher bounds and JSON-safety, and defer paged Host routing to a separate change.
- [Shared extraction could alter production rows or review behavior] -> Retain compatibility methods and extend row, transition, integration, and invariant parity tests before delegation.
- [Matcher compute can outlive its input basis] -> Require recaptured Host hash plus repository reference CAS at apply time; failure consumes no accepted facts or proposal changes.
- [Review actions can invalidate graph facts] -> Return a bounded delta and mark private projections stale; production wrappers retain the existing explicit downstream behavior.
- [One mutation lease limits throughput] -> Prefer deterministic serialization for the private foundation; bounded proposal reads remain available.

## Migration Plan

1. Add failing Core 209 contract/application/repository/composition tests.
2. Extract shared proposal rows, DDL, CRUD, state transitions, matching projection rules, and persistence-neutral fact commands while preserving plugin compatibility.
3. Add strict contracts and the two-stage application over the shared matcher engine and repository port.
4. Extend the isolated Node repository and compose the application privately after recovery.
5. Update inventories, boundaries, current-state documentation, and focused parity/invariant tests.
6. Run focused and full validation plus strict OpenSpec verification.

Rollback removes the private composition and isolated matching tables while production plugin ownership remains unchanged. Existing isolated shadow files are not production state and are never used as fallback.

## Open Questions

None. Host pagination, WS6 canary routing, generic review actions, repair, and production cutover require separate changes.
