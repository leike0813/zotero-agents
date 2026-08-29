## Why

Durable bundle import already records enough SQLite and canonical-store evidence to recover every supported crash window, but production startup never invokes the cross-store reconciliation owned by `DurableBundleApplication`. A crash after the SQLite commit receipt is written can therefore leave canonical writes permanently blocked even though the runtime still publishes ready discovery.

## What Changes

- Make production Durable Bundle application acquisition reconcile pending imports before returning a ready application.
- Treat the SQLite durable-import receipt as the commit witness: committed imports roll forward canonical promotion, while staged batches without a receipt are discarded.
- Fail startup without publishing discovery when receipt, batch, or promoted targets cannot be reconciled safely.
- Route live post-commit completion and startup recovery through one private completion path; only that path may clear the repository receipt.
- Replace string recovery statuses with typed internal outcomes and reason-level startup error codes.
- Remove unused or hypothetical public seams around local repository/canonical adapters and durable export sinks.
- Preserve the existing SQLite table, canonical batch, bundle manifest, and WebDAV wire formats.
- Remove the obsolete `canonical-store-changed` event requirement; current WebDAV imports intentionally do not trigger autosync.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-durable-bundle-import-foundation`: Require ready-gated production acquisition, roll-forward recovery, safe pre-commit discard, target verification, and fail-closed mismatch handling.
- `synthesis-layer-foundation`: Remove the obsolete canonical-store change event contract while retaining promotion and projection-staleness completion semantics.

## Impact

- Rust crates: `synthesis-application`, `synthesis-canonical-store`, and `synthesis-sidecar` production composition and lifecycle tests.
- Development parity driver: deterministic acquisition is available only under a dedicated Cargo feature.
- Documentation: WebDAV durable-sync, persistence, sequence, and knowledge-graph current-state descriptions.
- No database migration, persisted-format change, WebDAV DTO change, plugin UI change, dependency change, or automatic offline repair is introduced.
