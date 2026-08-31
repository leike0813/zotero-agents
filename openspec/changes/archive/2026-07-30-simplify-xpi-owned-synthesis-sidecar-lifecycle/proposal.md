## Why

The Synthesis sidecar is shipped only inside the XPI and has no independent
online update, hot-swap, or rollback channel. The current runtime admission,
generation, promotion, cutover, activation-evidence, and multi-version
installer model assumes those unsupported product capabilities. It duplicates
identity across local files, rejects ordinary restarts, masks real RPC errors,
and makes startup depend on stale packaging and process metadata.

## What Changes

- Make the current XPI bundle the only runtime source and materialize it into
  one fixed verified installation.
- Replace owner, lease, global discovery, and stale-marker recovery with one
  process-held production lock and one launch-scoped session.
- Start the Rust owner directly against production storage and use one bounded
  health/handshake before publishing the native client.
- Remove runtime admission, generations, pending upgrade, promotion, cutover
  receipt dependencies, activation evidence, startup critical smoke, and
  installed-version rollback.
- Preserve real RPC error codes and keep service-instance fencing within the
  current live connection only.
- Back up production only when a future registered schema migration is
  required; ordinary startup performs no backup or preflight.
- Stop reading legacy control files while leaving them unchanged on disk.

This change supersedes `resolve-equivalent-synthesis-runtime-builds`.

## Capabilities

### Modified Capabilities

- `synthesis-sidecar-runtime-packaging`: install exactly the current XPI bundle
  into one fixed verified location.
- `synthesis-sidecar-runtime-supervision`: supervise one launch-scoped native
  child with a production lock and session discovery.
- `synthesis-native-production-activation`: publish one native composition
  after current-session health and handshake.

### Removed Capabilities

- `synthesis-native-runtime-upgrade`: there is no independent runtime upgrade
  lifecycle.
- `synthesis-production-owner-cutover`: production is already Rust-owned and
  startup no longer performs owner transfer.

## Impact

This is an internal breaking simplification across the TypeScript lifecycle,
shared sidecar contracts, Rust runtime entrypoint, focused Core tests, and
current Synthesis architecture documentation. Public `SynthesisClient`
operations, database content, canonical formats, reverse-Host capabilities,
and user-visible Workbench behavior remain unchanged.
