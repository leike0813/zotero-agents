## 1. Contracts and Failing Tests

- [x] 1.1 Add Core 193 failing tests for strict manifest rebuilding, supported targets, packaged and installed verification, staged activation, repair, rollback, and path confinement.
- [x] 1.2 Extend Core 164, Core 152, and Core 168 first with architecture detection, installer dependency isolation, unchanged production composition, and `108 / 1` inventory assertions.
- [x] 1.3 Add the environment-neutral runtime bundle and pointer contracts with strict rebuilding and stable platform identifiers.

## 2. Platform and Persistence Primitives

- [x] 2.1 Add normalized runtime architecture and Synthesis runtime-target detection without command or PATH discovery.
- [x] 2.2 Add fail-closed atomic managed text replacement and the fixed sidecar runtime persistence paths.
- [x] 2.3 Add a runtime SHA-256 primitive that works in Zotero and Node test environments without importing Node-only modules into the plugin bundle.

## 3. Runtime Installer

- [x] 3.1 Implement packaged manifest resolution and complete packaged-file size/hash verification.
- [x] 3.2 Implement immutable staged installation, POSIX permission repair, installed-tree verification, and atomic activation.
- [x] 3.3 Implement single-flight idempotency, corrupt active repair, strict inspection snapshots, and one-version rollback.
- [x] 3.4 Add static boundary guards proving the installer cannot spawn processes, resolve commands, access production Synthesis data, or leave its fixed managed root.

## 4. Build and Release Supply Chain

- [x] 4.1 Add deterministic service/runtime package and release-governance scripts pinned to Node `24.18.0`.
- [x] 4.2 Add five-platform prebuild workflow, fixed-tag synchronization, upstream checksum/signature provenance, and runtime freshness checks.
- [x] 4.3 Wire plugin assets, package scripts, release preflight, and XPI runtime-content checks without requiring end-user downloads.

## 5. Documentation and Validation

- [x] 5.1 Update Synthesis README, runtime/rebuild, persistence, invariant, and Stage 1 current-state docs for packaged-but-not-launched runtime behavior.
- [x] 5.2 Run Core 193/192/164/152/168, contracts/service/root TypeScript, service-boundary, Synthesis invariants, targeted Prettier/ESLint, production build, `git diff --check`, and strict OpenSpec validation.
