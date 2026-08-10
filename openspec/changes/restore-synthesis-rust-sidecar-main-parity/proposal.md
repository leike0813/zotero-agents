## Why

The Rust Synthesis sidecar's closed production roster is not behaviorally equivalent to the native in-process service at `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`. The roster contains the 95 baseline wire operations plus one approved operation-control extension. Current parity gates largely prove that refactored packages agree with each other, while production routes still contain wrong side effects, placeholder projections, missing Workbench surfaces, synchronous long-running work, and wire limits that reject valid payloads.

The sidecar therefore cannot enter acceptance or authorize removal of the retained plugin and Node oracles. Production behavior, data movement, and performance must be rebased on the fixed executable baseline before retirement resumes.

## What Changes

- Freeze R9b plugin/Node deletion and treat the current regression repair as candidate evidence until this change's behavioral gates pass.
- Make the fixed 131-method native service inventory the migration audit baseline; every method receives an explicit migrated, merged, Host-owned, or approved-retired disposition. Retirement is limited to the 23 methods recorded in the migration SSOT.
- Replace roster-only parity with baseline-derived, real-process evidence covering public DTOs, SQLite facts, canonical hashes, Host effects, idempotency, rollback, and read-only behavior.
- **BREAKING**: Return the existing public operation receipt for full-library and worker-backed mutations instead of holding one production RPC open until terminal completion; update all grouped-client consumers together.
- Preserve user-visible grouped-client semantics while moving large Topic, artifact, review, and export bodies through existing locator/transfer/delivery paths instead of the general JSON envelope.
- Replace the monolithic Rust compatibility dispatcher with typed domain adapters and restore Topic, Workbench, Reference, Citation, Tag, Concept, Topic Graph, durable, WebDAV, maintenance, and debug semantics from the fixed baseline.
- Replace full-library materialization and N+1 reads with bounded pages, keyed delta queries, short transactions, batched Host effects, and repository-owned read concurrency.
- Preserve durable user facts through registered forward migration while invalidating only rebuildable caches.
- Restore every Review path as one bounded public projection: Reference binding/merge and canonical revisions, Concept decisions, and Topic Graph suggested/review relations must remain visible, actionable, diagnostic, reversible, and durable through the real Rust production route.
- Restore the Citation Graph default projection to library nodes plus external nodes cited by more than one distinct library source, keep single-source external nodes hover-only, and make public pages and layout consume the same bounded projection.
- Make Workbench UI state JSON-safe at its boundary, harden accepted layout work against timeout/panic/finalization gaps, and expose a bounded sidecar runtime status in the Workbench top bar.
- Establish 10k full-experience and 25k bounded-degradation production-route gates before acceptance can resume.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-native-production-routing`: Require baseline-backed operation behavior, typed routes, operation-specific wire strategies, and asynchronous receipts for long work.
- `synthesis-client-contracts`: Preserve grouped user semantics while coordinating receipt-returning long mutations and internal locator/transfer DTOs.
- `synthesis-persistence-performance`: Apply bounded DTO, query-count, memory, latency, and concurrency requirements to the real production route.
- `synthesis-work-governance`: Define receipt, continuation, cancellation, retry, terminal, and restart behavior for long native operations without adding a global queue.
- `synthesis-workbench`: Restore every Workbench surface from domain-specific bounded Rust projections.
- `synthesis-host-artifact-read-port`: Keep large artifact content off the general client envelope and permit bounded, ordered Host reads.
- `synthesis-incremental-update-triggers`: Restore one-scan changed-source Reference refresh and scoped cache invalidation.
- `synthesis-rust-sidecar-migration-governance`: Block acceptance and destructive retirement until the fixed baseline inventory, real-route parity, scale, and real-machine gates pass.

## Impact

The change affects the Synthesis operation manifest and surface corpora, grouped TypeScript client and consumers, reverse-Host and transfer adapters, Rust production dispatcher/application/repository layers, SQLite migration and query shapes, existing Synthesis tests and fixtures, OpenSpec retirement dependencies, and active Synthesis architecture/performance documentation. It adds no dependency, restores no runtime fallback, starts no development server, and does not prebuild, release, publish, or synchronize Gitee.
