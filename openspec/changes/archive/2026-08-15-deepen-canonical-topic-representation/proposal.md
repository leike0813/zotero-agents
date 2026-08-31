## Why

Topic canonical representation rules are split across the Topic application, its canonical adapter, and the canonical store. Callers currently assemble paths, derived hashes, manifests, section filenames, snapshots, promotions, and transaction identities before the store repeats part of the same validation, creating duplicate sources of truth and allowing invalid representation states to cross the application seam.

## What Changes

- Deepen the existing canonical-store module so it alone prepares, decodes, validates, and materializes Topic canonical representation.
- Replace caller-constructed snapshots and promotions with a representation-neutral draft, an opaque prepared write, transport-neutral canonical assets, and a transparent typed read projection.
- Keep pure representation preparation outside the injected Topic canonical port; shrink that port to the durable operations whose behavior actually varies across production and parity adapters.
- Move canonical transaction identity generation into the store, with deterministic injection available only to the parity harness.
- Replace string-matched representation and store failures at the Topic seam with typed internal outcomes while preserving existing public status and reason codes.
- Route durable export/import and legacy Topic adoption through the shared representation rules without changing their domain ownership or lifecycle protocols.
- **BREAKING**: remove the Rust workspace's public field construction path for `TopicSnapshot` and `Promotion`; all in-repository callers migrate atomically.
- Preserve existing canonical bytes and hashes, filesystem layout, bundle and WebDAV wire formats, Topic results, SQLite receipt protocol, and promotion/recovery semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-topic-canonical-store-foundation`: Make canonical representation preparation, asset decoding, typed reads, transaction identity, and durable materialization one store-owned interface.
- `synthesis-sidecar-topic-application-foundation`: Keep Topic domain validation and commit timing application-owned while requiring it to construct complete snapshots through the canonical representation interface.
- `synthesis-sidecar-durable-bundle-export-foundation`: Require canonical Topic capture to use transport-neutral assets produced by the canonical-store interface while preserving coherent-basis export behavior.
- `synthesis-sidecar-durable-bundle-import-foundation`: Require canonical Topic assets to be decoded into opaque prepared writes before existing recoverable staging, without changing the receipt or recovery protocol.

## Impact

- Rust crates: `synthesis-canonical-store`, `synthesis-application`, and focused `synthesis-sidecar` lifecycle fixtures.
- Internal Rust interface: Topic canonical draft/prepared/read/asset/error types, the minimal Topic canonical port, and parity-only transaction identity injection.
- Documentation: Synthesis ownership, persistence, Topic apply, and durable import/export sequences.
- No new crate, source module, third-party dependency, persisted-format migration, wire change, public Topic behavior change, or durable-import lifecycle change.
