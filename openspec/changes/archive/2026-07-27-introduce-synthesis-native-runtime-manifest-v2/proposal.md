## Why

The Synthesis sidecar is now application- and durability-complete in Rust, but
the plugin delivery boundary still describes a pinned Node executable,
JavaScript entrypoint, and Node-specific release provenance. The two existing
five-platform workflows also fail before checkout because a dated Rust
toolchain name is used as a `dtolnay/rust-toolchain` action revision, so R8
cannot produce trustworthy native candidates until packaging, lifecycle, and
workflow ownership are changed together.

## What Changes

- **BREAKING** Replace runtime bundle and pointer v1 with strict native manifest
  v2 documents that identify one Rust executable, exact target triple,
  fingerprints, provenance, signature status, capabilities, timestamps, and
  complete file hashes without Node-specific fields.
- **BREAKING** Replace Node launch identity and installed snapshot fields with
  native implementation, executable path, build fingerprint, and platform
  signature identity; launch only `<binary> serve --config <path>`.
- Extend the Rust candidate service to own the existing strict lifecycle,
  discovery, health, handshake, bounded worker, cancellation, drain, restart,
  and orphan-cleanup semantics over isolated shadow roots.
- Preserve atomic active/previous installation for compatible v2 Rust bundles,
  add recoverable quarantine for corrupt v2 installations, and prevent legacy
  v1 bundles from entering the rollback chain.
- Consolidate the duplicate Synthesis sidecar workflows into one five-platform
  native candidate workflow, pin the toolchain action by full commit SHA, and
  remove automatic fixed-tag publication from ordinary pushes.
- Replace Node/JavaScript/D3 runtime assembly, freshness, and XPI inventories
  with native v2 candidate and formal fail-closed signature gates.
- Keep the Node applications as development-only differential oracles. Do not
  change the production Synthesis owner, database, canonical owner, public
  mutation capabilities, or `SynthesisClient` ownership in this change.

## Capabilities

### New Capabilities

- `synthesis-native-runtime-manifest-v2`: Defines the strict native runtime
  identity, packaging, signature, expiry, upgrade, rollback, and workflow
  contract used by R8 candidates.

### Modified Capabilities

- `synthesis-sidecar-runtime-packaging`: Replaces the Node v1 package and XPI
  inventory with one native executable and manifest v2.
- `synthesis-sidecar-runtime-supervision`: Launches and validates only the
  installer-verified Rust executable and native lifecycle identity.
- `synthesis-sidecar-runtime-foundation`: Makes the Rust service implement the
  existing authenticated health, handshake, general, and compute surface.
- `synthesis-sidecar-shutdown-drain`: Extends bounded drain and failure-isolated
  cleanup to the Rust service and child worker process.
- `synthesis-sidecar-service-boundary`: Keeps production ownership unchanged
  while making the native service the only installable runtime implementation.
- `synthesis-cross-language-sidecar-contract`: Adds language-neutral manifest
  v2 and lifecycle corpus parity.
- `synthesis-rust-sidecar-migration-governance`: Records R8 completion gates and
  leaves production cutover and Node oracle removal to R9.
- `synthesis-sidecar-stage1-node-milestone-gate`: Reclassifies the Node runtime
  as a development-only oracle that cannot enter native installation or
  rollback.

## Impact

The change affects shared sidecar contracts; plugin runtime manifest,
installer, persistence, supervisor, and control clients; the Rust sidecar
binary and protocol facade; native packaging/freshness/XPI scripts; the
five-platform GitHub Actions workflow; Core 192–201 and 218 tests; Rust tests;
and active Synthesis packaging, supervision, and migration documentation.

No database or canonical schema migration is introduced. No dependency is
added, no remote workflow is dispatched, and no release asset is published by
the implementation work itself.
