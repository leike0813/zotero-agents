## Context

The native runtime is a locked plugin input, not an independently versioned
download. A release must therefore bind the source commit, exact seven-platform
workflow result, archive aggregate, materialized files, and complete receipt.

## Design

### Runtime identity

`sidecarRuntimeBundle` advances to v3. It accepts seven logical targets and
their Rust triples. The manifest remains strict and includes the complete
per-file SHA-256 inventory, but removes `platformSignature`; production
verification is file integrity plus release-set evidence rather than an
external signing result.

The target set is `win32-x64`, `darwin-x64`, `darwin-arm64`, `linux-x86`,
`linux-x64`, `linux-arm`, and `linux-arm64`. Runtime detection recognizes x86
and arm Linux explicitly and returns `unsupported` for every other tuple.

### Content-addressed prebuilds

The `synthesis-sidecar-runtime-prebuilds` branch stores immutable sets at
`sets/<aggregate>/`. Every set has exactly seven deterministic archives and a
manifest that binds archive digests, build fingerprint, source fingerprint,
and target identities. A workflow result document binds the repository,
workflow, run, request, source SHA, aggregate, branch commit, and set path.
Consumers must validate the specified result; they never select the latest run.

### Controlled release

Preparation writes a sidecar release set containing the source commit and
prebuild result identity. Dispatch accepts only that committed set from clean,
synchronized `main`. The workflow restores the exact set, verifies it before
replacement, materializes `addon/bin/synthesis-sidecar`, writes a receipt, and
then finalizes source main. A failed workflow can only resume the same release
set and aggregate.

### Safety

All synchronization validates every remote archive and all identities before
touching managed addon files. Replacement uses backups and rollback. The
workflow is manually dispatched; push candidates have read-only permissions.

## Verification

Tests cover manifest parsing, target triples and detection, prebuild identity
and archive rejection, transactional synchronization, receipt transitions, and
plugin-release gates. Rust formatting, clippy, workspace tests, health-route
coverage, and cross-language checks remain candidate gates.
