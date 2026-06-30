# Host Bridge CLI Release and Install Governance

## Summary

Move Host Bridge CLI prebuild handling from surface-change-driven rebuilds to CLI build-input-driven rebuilds. The CLI build workflow records a build fingerprint, bumps the CLI patch version only when build inputs change, and keeps wrapper/profile/surface publishing on a separate path that reuses the latest prebuilds.

## Motivation

Host Bridge surfaces, wrapper skill text, profile templates, broker capabilities, and documentation can change without changing the Rust CLI binary. Rebuilding every supported CLI target for those changes wastes CI time and makes CLI version meaning unclear. The preferences-page CLI installer also needs deterministic upgrade semantics: it must install the bundled binary from the current XPI, overwrite stale targets, and restore executable bits after copying.

## Scope

- Add a CLI release manifest that records the current build fingerprint, CLI version, and prebuild checksums.
- Gate full CLI matrix builds on build-input fingerprint changes or explicit dispatch.
- Automatically bump the CLI patch version on `main` when the fingerprint changes.
- Split surface/profile publishing so it reuses the latest CLI prebuilds instead of rebuilding the CLI.
- Enhance the preferences CLI installer to compare source/target hashes, overwrite stale targets, and chmod installed POSIX binaries.

## Out of Scope

- Changing ACP run-local shim injection behavior.
- Moving the CLI version SSOT away from `cli/zotero-bridge/Cargo.toml`.
- Rebuilding CLI binaries for wrapper/profile/docs-only changes.
