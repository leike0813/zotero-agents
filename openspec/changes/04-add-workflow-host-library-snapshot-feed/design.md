## Context

See `proposal.md` for motivation. Ordinary live keyset pages cannot prove one stable cross-page set. Host Bridge already has a remote library projection, Hermes maintains a local metadata index, and Synthesis provides durable application/repository owners; none currently owns a complete full-snapshot lifecycle across these projections.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. Contract foundation change `01-establish-workflow-host-v12-contract-foundation` is required. Live read change `03-add-workflow-host-library-live-reads` owns reusable item serialization but does not define snapshot consistency.

## Goals / Non-Goals

**Goals:**

- Capture one bounded item set and prove complete delivery.
- Offer local callback and remote cursor projections over one Broker owner.
- Make Hermes index replacement transactional and failure-safe.
- Preserve TypeScript, Rust, CLI, and agent-facing semantic parity.

**Non-Goals:**

- Incremental change logs, tombstones, permanent snapshot history, or restart resume.
- Making Synthesis the owner of Zotero snapshot semantics.
- Exposing unrelated v12 members through Host Bridge or MCP.
- Editing generated Host Bridge guidance directly or dispatching a release.

## Decisions

### The Broker owns the snapshot session

The Broker captures the library basis, fixed item identity set, stable ordering, session TTL, cursor validation, batch reads, and terminal evidence. The implementation uses a bounded process-local registry. Capturing native Zotero objects for the session lifetime is prohibited; each page re-reads and validates portable identities against the captured basis policy.

Using ordinary live pages was rejected because absent-row deletion requires a complete stable set. A durable cross-process snapshot log was rejected as unnecessary protocol and storage complexity.

### Workflow and remote projections intentionally differ in shape

`library.withItemSnapshot` drives serial callbacks and hides pagination. Host Bridge/CLI expose opaque snapshot and cursor identities. Both adapters consume the Broker session and use canonical item DTOs. Neither projection becomes the other one's source of truth.

### Index replacement uses staging and one promotion boundary

Hermes writes one generation keyed by snapshot identity. Only completed evidence can promote it and remove absent rows. Cancellation, expiry, hard limits, Host restart, write failure, or evidence mismatch discards or quarantines staging while leaving the prior generation current.

### Synthesis stores index state, not Zotero semantics

Canonical contracts define portable snapshot/index messages. Rust application and repository code own durable staging and promotion. The TypeScript library adapter owns Host reads. This preserves the sidecar production owner without letting repository or RPC shapes enter Workflow Host.

### Host Bridge semantic review is a change gate

Before source edits, run the semantic context collector and resolve affected surfaces from `host-bridge/surfaces.json`. Record materialized metrics against the fixed baseline and an empty explicit deletion inventory. After source review, require zero unmapped, downgraded, unauthorized-dropped, and intra-package duplicate units; substantive instruction lines cannot fall and normalized prose must remain at least 95% of baseline. Generated targets are handled only by the governed renderer after a non-blocked review.

## Risks / Trade-offs

- [Session memory grows with a large library] → Store bounded portable identity/basis data, enforce the one-million-item cap, and release terminal/expired sessions.
- [Item changes during a captured snapshot] → Define and validate the captured basis; fail the session rather than mixing incompatible revisions.
- [Hermes promotes incomplete data] → Make complete evidence a repository promotion precondition tested through process integration.
- [Snapshot and live serializers drift] → Reuse the library-read serializer owner and keep snapshot-specific state separate.
- [Agent guidance is accidentally thinned] → Empty deletion inventory plus semantic and relative-thickness gates block the change.

## Migration Plan

1. Record Host Bridge materialized baseline metrics and the empty deletion inventory.
2. Add failing Broker session, projection, and Hermes promotion tests.
3. Implement Broker capture/read/terminal lifecycle and the Workflow callback projection.
4. Implement Host Bridge/CLI transport projection and Hermes/Synthesis staging/promotion.
5. Review semantic sources, run parity/depth/duplicate gates, then render through the governed workflow if required.
6. Run focused TypeScript/Rust/CLI/Hermes tests and the final project gates.

Rollback disables the new snapshot route and discards non-authoritative staged generations. The prior index remains usable; no Zotero user-library schema changes.
