## Context

The isolated service already composes private Tag Vocabulary, Concept KB, and Topic Graph applications over one recovered SQLite repository. Their active state uses different concurrency bases: Tag Vocabulary has a revision while Concept KB and Topic Graph each have a manifest. Production checkpoint export and JSON import already contain compatible canonicalization, hash, and diff facts, but their file layout, legacy projection fallback, public DTOs, and sequential production apply orchestration are plugin-owned and cannot become the sidecar transaction model.

This slice must create a portable cross-domain knowledge payload and an all-or-nothing private restore path without copying transient state, exposing a public route, or making a checkpoint file/cache the runtime source of truth. The shared application and repository packages remain environment neutral; SQLite transaction ownership stays in the Node adapter.

## Goals / Non-Goals

**Goals:**

- Define one strict versioned checkpoint contract for active Tag Vocabulary, all six Concept KB row families, and all three Topic Graph row families.
- Make payload normalization, counts, and hashing deterministic and bounded.
- Preview full-replacement impact against one atomic capture and bind it to the exact active bases.
- Apply all three replacements in one repository transaction with basis CAS and rollback.
- Preserve runtime-only Tag state and last-good indexes while invalidating imported index bases.
- Compose a private, drainable coordinator after recovery and before repository shutdown.
- Share only semantically identical normalization, hash, and diff helpers with production import/export.

**Non-Goals:**

- Merge import, partial-domain import, conflict UI, durable receipt persistence, file destinations, or handle registries.
- Generic durable bundles containing references, discovery state, related-item effects, or Topic current canonical assets.
- WebDAV, HEAD/ETag, retry, remote conflict resolution, or sync indexes.
- Public HTTP/RPC, `SynthesisClient`, Workbench, Host Bridge, MCP, production database/canonical ownership, WS6 parity, or WS7 cutover.
- Replacing production canonical per-asset export files, legacy projection fallback, public DTOs, or production apply ordering.

## Decisions

### Use one bounded normalized payload with metadata outside the hash

`SynthesisKnowledgeCheckpoint` carries a fixed format/version, the three captured bases, normalized row collections, normalized per-family counts, `checkpointHash`, and `generatedAt`. Strict rebuilding rejects unknown fields, duplicate stable identifiers, invalid references, and family/global bound violations. Rows are normalized and deterministically ordered before counts and hash calculation. The hash covers only format/version, bases, and normalized domain payload, so re-exporting unchanged state at a different time produces the same hash.

The alternative of hashing serialized input would make semantically equivalent ordering differ and would make generated timestamps invalidate receipts. The alternative of exporting indexes, staged suggestions, audits, pending effects, or other runtime/cache rows would turn rebuildable or local operational state into portable authority.

### Make preview a single in-memory capability receipt

The coordinator holds at most one receipt. `previewImport` verifies and normalizes the checkpoint, atomically captures current bases and rows, computes add/update/delete counts per row family/domain, and reports every user-decision override caused by full replacement. The receipt binds a random receipt ID to checkpoint hash plus the captured Tag revision, Concept manifest, and Topic Graph manifest. A new preview replaces the old receipt.

The receipt is intentionally process-local and single-use. Restart, explicit discard, admission stop, or any apply attempt clears it. Durable receipts would create a second state machine and are deferred to the later durable-bundle slice.

### Require explicit full-replacement acknowledgement at apply

`applyImport` accepts the receipt ID, the checkpoint hash, and an explicit full-replacement acknowledgement. Missing acknowledgement or any mismatch fails before mutation. The receipt is consumed at the beginning of every apply attempt so validation failure, stale basis, or row failure cannot be retried without a fresh preview.

This keeps destructive replacement unmistakable and ensures preview cannot be reused after any state-dependent decision.

### Add one cross-domain repository transaction instead of chaining applications

The shared checkpoint repository port exposes one atomic capture and one knowledge replacement primitive. The Node adapter begins one SQLite transaction, recaptures all three bases, replaces only active Tag Vocabulary rows plus Concept and Topic Graph aggregate rows, rebuilds the new bases through existing domain snapshot rules, and commits only when all expected bases still match. Any validation, constraint, injected row-write, or CAS failure rolls back every table.

Calling three public mutation applications sequentially was rejected because it cannot provide all-or-nothing replacement, would consume three independent admission/CAS policies, and would duplicate checkpoint-specific rollback logic.

### Preserve local operational state and invalidate derived indexes

Successful import leaves Tag staged suggestions, audit rows, and pending Host effects unchanged. It retains the exact last-good Tag, Concept, and Topic Graph index payloads/hashes but marks all three stale against the new bases. Checkpoint data never supplies an index payload. This separates portable domain truth from local work queues and derived acceleration state.

### Reuse existing domain rebuilders and production-compatible pure facts

Checkpoint verification and repository replacement delegate row normalization, reference validation, manifest/revision generation, and aggregate reconstruction to the existing Tag Vocabulary, Concept KB, and Topic Graph sources of truth. Production `checkpointExport.ts` and `jsonImport.ts` consume shared pure normalization/hash/diff helpers only where semantics are identical; their storage shapes and orchestration do not delegate to the private coordinator.

### Stop checkpoint admission before domain and repository shutdown

The service creates the coordinator only after repository recovery and the three domain applications exist. Shutdown first stops checkpoint admission, clears the receipt, and drains its active capture/preview/apply lease. It then stops/drains the domain applications, worker pool, and repository in the existing order. No new public capability or worker operation is required because checkpoint work is normalization and one main-process SQLite transaction.

## Risks / Trade-offs

- [A large cross-domain snapshot can retain too much memory] → Enforce the existing domain bounds before allocation growth and keep only one normalized checkpoint/receipt.
- [Cross-domain replacement can leave partial rows] → Own all deletes/inserts/state updates in one SQLite transaction and verify with injected row-write failure tests.
- [A preview can become stale before apply] → Bind all three bases and recapture them inside the committing transaction.
- [Portable input can overwrite confirmed user decisions] → Surface every affected decision in preview and require explicit full-replacement acknowledgement.
- [Shared helpers can accidentally change production formats] → Share pure semantic facts only and lock production checkpoint/import compatibility with existing Core suites.
- [Shutdown can close SQLite during active apply] → Stop admission, invalidate receipts, and await the active coordinator lease before closing domain applications and repository.

## Migration Plan

1. Add Core 213 strict-contract, preview, lifecycle, and real SQLite atomicity coverage before implementation.
2. Add shared checkpoint contracts/pure helpers, repository transaction ports, and the private coordinator.
3. Extend the Node SQLite adapter and compose the coordinator after recovery.
4. Delegate compatible production normalization/hash/diff facts without changing production external behavior.
5. Update inventories, runtime packages, fingerprints, current-state documentation, and Stage 1 WS5 status.
6. Run focused compatibility suites, package/service/root checks, runtime/XPI fail-closed checks, and strict OpenSpec verification.

Rollback removes the private coordinator, checkpoint contracts, and cross-domain adapter methods. The change adds no production schema or public route, and checkpoint state is not a runtime source of truth, so production migration or data rollback is unnecessary.

## Open Questions

None. Durable bundle packaging, remote transport, WebDAV conflict behavior, WS6 parity, and WS7 cutover remain separate changes.
