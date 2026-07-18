## Why

The isolated Synthesis sidecar now owns private Tag Vocabulary, Concept KB, and Topic Graph applications, but it still has no portable, atomic way to capture or restore their SQLite-backed knowledge state. Adding one cross-domain checkpoint boundary completes the first WS5 priority-7 slice and establishes a safe foundation for later durable bundle and WebDAV work without routing production persistence through the service.

## What Changes

- Add a strict, versioned, bounded `SynthesisKnowledgeCheckpoint` containing the active Tag Vocabulary plus all Concept KB and Topic Graph aggregate rows, domain bases, normalized counts, a deterministic payload hash, and generation time.
- Add one private knowledge-checkpoint application that builds and verifies checkpoints, previews a full replacement, applies a single-use preview receipt with explicit acknowledgement, discards receipts, stops admission, and drains on shutdown.
- Capture, diff, and replace all three domains through one shared repository transaction with basis recapture, validation, rollback, and preservation of runtime-only Tag rows.
- Preserve each domain's last-good index payload while marking every imported index stale after a successful replacement.
- Reuse semantically identical normalization, hashing, and diff facts from production checkpoint export and JSON import without changing their public DTOs, canonical per-asset files, legacy projection fallback, or production apply ordering.
- Compose the coordinator only after isolated repository recovery and close it before the existing domain applications and SQLite repository.
- Keep the application private: no HTTP/RPC method, `SynthesisClient` route, Workbench command, Host Bridge capability, MCP surface, production database write, canonical asset replacement, durable bundle, or WebDAV behavior is added.

## Capabilities

### New Capabilities

- `synthesis-sidecar-knowledge-checkpoint-application-foundation`: Defines strict cross-domain checkpoint capture, verification, preview receipts, atomic full replacement, index invalidation, and private service lifecycle semantics.

### Modified Capabilities

None. Existing production import/export, checkpoint, WebDAV, public API, and domain-application requirements remain unchanged.

## Impact

The change affects shared Synthesis contracts, application and repository packages, the isolated Node SQLite adapter and service lifecycle, production compatibility helpers, Core tests, package/build inventories, runtime/XPI fingerprints, and current-state Synthesis documentation. It adds no dependency, public protocol operation, production migration, canonical format change, background sync behavior, release surface, or user-visible UI.
