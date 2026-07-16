## Context

`apps/synthesis-service` is an independently compiled, mutation-disabled Node
application with a bounded loopback control plane. Its emitted JavaScript
currently lives only under `.scaffold/synthesis-service`, so no production
plugin code can obtain a trusted Node executable or service entrypoint.

The repository already has reusable packaged-asset reads, managed runtime file
operations, atomic path moves, executable-permission repair, and Host Bridge
prebuild fingerprint checks. Those primitives do not yet define a multi-file
runtime manifest, a versioned installation transaction, or architecture
detection. The new installer must remain a pure asset-management layer: it
cannot launch a process, inspect PATH, or touch data outside its fixed managed
root.

## Goals / Non-Goals

**Goals:**

- Produce one strict runtime bundle per supported platform from Node `24.18.0`
  and the compiled Synthesis service tree.
- Verify upstream provenance, packaged bytes, installed bytes, and executable
  permissions.
- Expose a verified absolute Node path and service entrypoint path for a later
  supervisor.
- Make installation, upgrade, repair, and one-version rollback atomic and
  idempotent.
- Preserve the current in-process production Synthesis composition.

**Non-Goals:**

- Launch, discover, supervise, authenticate, or health-check the service.
- Add owner locks, parent leases, restart policy, process-tree termination, or
  crash-loop recovery.
- Add workers, remote clients, production persistence, UI, or preferences.
- Download runtime assets on an end-user machine.

## Decisions

### 1. A strict manifest is the single runtime-bundle contract

`packages/synthesis-contracts` owns
`synthesis-sidecar-runtime-bundle.v1`. The manifest contains a full bundle ID,
Node/service/protocol versions, target platform, build fingerprint, upstream
archive identity, executable and entrypoint paths, and a complete file table.

The rebuilder rejects unknown fields, non-canonical or duplicate paths,
absolute paths, `.`/`..` segments, symlink entries, unsafe sizes, invalid
SHA-256 values, executable/entrypoint omissions, and platform-specific
executable mismatches.

Alternative: rely on sidecar `.sha256` files. Rejected because a runtime is a
multi-file atomic unit and needs one version/provenance identity.

### 2. The supported runtime matrix is explicit

The initial matrix is `win32-x64`, `darwin-x64`, `darwin-arm64`,
`linux-x64`, and `linux-arm64`. Runtime platform services add normalized
architecture detection from explicit overrides, Node `process.arch`, and
Zotero/Gecko ABI metadata. Unknown combinations return `unsupported`; they
never fall back to a nearby binary.

Alternative: include Windows arm64 immediately. Rejected because the Stage 1
matrix does not require it.

### 3. Build and release produce minimal product-owned runtime bundles

The packaging script consumes an already verified official Node archive,
extracts only the Node executable and required license/provenance files, builds
the current service JavaScript tree, writes a deterministic manifest, and
produces one platform archive. A dedicated matrix workflow verifies the Node
release SHASUMS signature, archive checksum, and platform-native signing where
available before publishing fixed-tag prebuild assets.

Release builds synchronize those assets into
`addon/bin/synthesis-sidecar/<platform>` and run a fingerprint/freshness gate.
The end-user plugin never downloads or resolves external runtimes.

Alternative: commit all Node binaries. Rejected because generated platform
runtime payloads are large and should remain release prebuild artifacts.

### 4. Installation is a staged immutable transaction

The fixed root is
`<runtimeRoot>/synthesis/service-runtime`. Versions live under
`versions/<bundleId>`. `ensureInstalled()` is single-flight in the plugin
process:

1. resolve and strictly rebuild the packaged platform manifest;
2. verify every packaged file against size and SHA-256;
3. copy into a unique staging directory under the managed root;
4. repair declared POSIX executable modes and verify the staged tree again;
5. atomically move staging to the immutable version directory;
6. atomically replace `previous.json`, then `active.json`;
7. re-read and verify the selected active installation.

An already verified version is reused. A corrupt version is removed and
reinstalled only within the managed versions directory.

Alternative: copy directly into the active directory. Rejected because an
interrupted copy could expose a partial runtime.

### 5. Pointer files are strict and atomically replaced

`active.json` and `previous.json` use
`synthesis-sidecar-runtime-pointer.v1` and store only the bundle ID. A shared
runtime-persistence helper writes a unique temporary sibling and atomically
moves it over the target. If the runtime lacks a safe atomic replacement API,
installation fails closed.

Rollback validates the previous installation before swapping pointers. An
invalid or missing previous version does not change the active pointer.

### 6. Installation paths never cross the managed root

Every manifest path is joined only after strict relative-path rebuilding.
Version IDs and staging identifiers are normalized fixed-format values. Cleanup
and repair operate only below the fixed service-runtime root and never parse a
manifest-provided absolute path.

### 7. Packaging is not production activation

Plugin startup and shutdown hooks remain unchanged. The installer is invoked by
tests and by the future supervisor change only. No production sidecar status,
consumer, or fallback is introduced here.

## Risks / Trade-offs

- [Runtime prebuilds substantially increase XPI size] → Keep platform assets as
  release prebuilds and add an explicit packaged-size/freshness gate.
- [Cross-platform signature validation cannot run on one host] → Use a matrix
  workflow and record verified provenance in the generated manifest.
- [Pointer update can fail between previous and active writes] → Active remains
  authoritative; `previous.json` is advisory and rollback always revalidates.
- [A malicious packaged manifest could target external paths] → Strictly reject
  all non-canonical relative paths before any file operation.
- [Plugin process concurrency could duplicate staging work] → Coalesce
  `ensureInstalled()` calls into one in-memory promise and use immutable final
  version directories.

## Migration Plan

1. Add the contracts and failing Core 193 tests.
2. Add architecture detection and atomic runtime persistence helpers.
3. Implement manifest resolution, installation, repair, and rollback.
4. Add packaging, governance, prebuild synchronization, and release gates.
5. Update current-state docs and run the full targeted validation set.

Rollback removes the new installer, assets, scripts, workflow, contracts, and
documentation. No process or production data ownership is changed.

## Open Questions

None. Launcher and full supervisor lifecycle are deliberately one subsequent
change so no unmanaged intermediate process topology is introduced.
