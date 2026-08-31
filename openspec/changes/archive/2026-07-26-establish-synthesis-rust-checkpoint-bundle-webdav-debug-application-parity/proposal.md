## Why

R7 already has durable Rust repository/canonical parity and three independent typed application clusters, but Knowledge Checkpoint, Durable Bundle, WebDAV Sync, and Debug/Maintenance still execute application policy only through the frozen Node oracle. This final cluster needs the same typed Node/Rust evidence before R7 can complete and R8 native runtime work can begin.

## What Changes

- Add high-cohesion Rust application modules for Knowledge Checkpoint, Durable Bundle export/import, WebDAV Sync, and Debug/Maintenance.
- Extend the Rust repository and canonical-store façades with typed capture, CAS replacement, durable import transaction, debug projection, and explicit canonical import discard operations.
- Add a physically isolated differential corpus, Rust development driver, Node checker, and five-target candidate gate for public DTOs, all 51 SQLite tables, canonical state, WebDAV state/remote objects, and reopen behavior.
- Preserve the production `SynthesisClient`, database schema, Host/canonical ownership, HTTP capabilities, runtime manifest, and existing read canaries.
- Mark R7 complete and R8 eligible to start after the final typed parity evidence passes, without authorizing manifest v2 or production cutover in this change.

## Capabilities

### New Capabilities

- `synthesis-rust-checkpoint-bundle-webdav-debug-application-parity`: Typed Rust application and differential-evidence requirements for the final R7 cluster.

### Modified Capabilities

- `synthesis-sidecar-knowledge-checkpoint-application-foundation`: Require a typed Rust boundary and independent parity evidence.
- `synthesis-sidecar-durable-bundle-export-foundation`: Require typed Rust export/verification parity and manifest-last publication evidence.
- `synthesis-sidecar-durable-bundle-import-foundation`: Require typed Rust preview/apply/recovery parity across SQLite and canonical storage.
- `synthesis-sidecar-webdav-sync-application-foundation`: Require typed environment-neutral Rust orchestration and bounded retry/cancellation parity.
- `synthesis-sidecar-debug-maintenance-application-foundation`: Require typed Rust bounded read and delegated maintenance parity.
- `synthesis-sidecar-isolated-repository-foundation`: Add typed final-cluster captures, CAS operations, durable import transactions, and coherent debug projections without schema changes.
- `synthesis-cross-language-sidecar-contract`: Add a dedicated final-cluster differential corpus and candidate gate.
- `synthesis-rust-sidecar-migration-governance`: Complete R7 only after this cluster passes and then unblock, but do not start, R8.

## Impact

The change affects the Rust `synthesis-application`, `synthesis-repository`, and `synthesis-canonical-store` crates; Core 213–218; a new immutable contract corpus and checker; `package.json`; the five-target Rust candidate workflow; and the Synthesis migration document. Node remains a read-only differential oracle, no third-party dependency is added, and no production capability or runtime ownership changes.
