## Why

An admitted Synthesis profile currently treats its first Rust bundle build
fingerprint as permanently immutable. Installing a newer compatible native
bundle therefore turns a healthy Rust-owned profile into `runtime_mismatch`
repair, even though the protocol, data schema, and capability contract are
unchanged. The runtime needs a crash-safe Rust-to-Rust upgrade path that
preserves the first cutover evidence and all production data.

## What Changes

- Separate the immutable first-cutover receipt from a new current runtime
  admission state with generation-bound pending-upgrade evidence.
- Automatically upgrade only when profile, protocol, data schema, and
  capability fingerprint remain compatible and only the build fingerprint
  changes.
- Back up the production database family and canonical tree, preflight the new
  bundle on the backup, run mutation-disabled critical smoke, and promote the
  new generation only after durable activation evidence exists.
- Restore the verified old Rust bundle after failures before activation; never
  fall back to Node/plugin ownership or perform a clean reset.
- Resume promotion after a crash when matching Rust-persisted activation
  evidence exists, and prohibit rollback after activation.
- Report the structured lifecycle phase and reason as
  `runtime-admission / runtime_mismatch`, including old and new fingerprints,
  instead of deriving a code by truncating error text.

## Capabilities

### New Capabilities

- `synthesis-native-runtime-upgrade`: Defines compatible Rust-to-Rust runtime
  admission generations, backup/preflight/activation promotion, and recovery.

### Modified Capabilities

- `synthesis-production-owner-cutover`: Keeps first ownership transfer evidence
  immutable while routing admitted restarts and compatible native upgrades
  through distinct paths.
- `synthesis-native-production-activation`: Binds smoke and durable activation
  evidence to the pending runtime generation and separates promotion from
  startup reconcile.
- `synthesis-sidecar-runtime-packaging`: Retains verified old and new
  content-addressed bundles long enough for bounded pre-activation recovery.
- `synthesis-sidecar-runtime-supervision`: Launches an explicitly pinned
  runtime generation and exposes generation identity across discovery, health,
  and handshake.
- `synthesis-sidecar-debug-observability`: Adds the runtime-admission phase and
  stable structured mismatch evidence to the existing debug lifecycle
  projection.

## Impact

- Affects Synthesis production contracts, cutover/owner coordination, backup,
  runtime installation and supervision, lifecycle diagnostics, and the Rust
  production runtime contract/service/lifecycle.
- Adds one private atomically persisted runtime-admission state file; it does
  not change the production database schema, canonical bytes, public
  `SynthesisClient`, or the first cutover receipt.
- Does not support protocol, data-schema, or capability migrations and does not
  authorize release, prebuild dispatch, publication, Gitee synchronization,
  clean reset, or validation against the live `Zotero_data_2` profile.
