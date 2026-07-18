## Why

The independent Synthesis Node service now has a tested control-plane
foundation, but it still runs only from developer build output. Before the
plugin can safely launch or supervise it, the repository needs one trusted,
product-owned runtime supply chain that produces verified absolute Node and
service entrypoint paths without consulting system Node, npm, PATH, or a user
shell.

## What Changes

- Add a strict environment-neutral manifest for Synthesis sidecar runtime
  bundles covering identity, versions, platform, provenance, file sizes,
  SHA-256 hashes, and executable permissions.
- Pin the product-owned runtime to Node `24.18.0` for Windows x64, macOS
  x64/arm64, and Linux x64/arm64.
- Add build, package, prebuild synchronization, release-governance, and
  freshness checks for the Node executable, compiled service tree, licenses,
  and manifest.
- Add a plugin-side installer that validates packaged assets, stages a complete
  version, verifies the installed copy, atomically promotes it, and preserves
  one verified previous version for rollback.
- Fail closed for unsupported platforms, unsafe manifests, partial installs,
  hash or size mismatches, and invalid active pointers.
- Keep process launch, discovery, supervision, workers, remote clients,
  production data access, and production ownership unchanged.

## Capabilities

### New Capabilities

- `synthesis-sidecar-runtime-packaging`: Defines the product-owned runtime
  bundle, trusted asset provenance, platform matrix, managed installation,
  atomic activation, repair, and rollback behavior.

### Modified Capabilities

- `synthesis-sidecar-runtime-foundation`: Changes the current-state runtime from
  development-build-only to a packageable service artifact while preserving
  its isolated mutation-disabled behavior.
- `runtime-platform-services`: Adds architecture detection and packaged runtime
  asset handling that never uses command discovery or PATH.
- `runtime-persistence-governance`: Adds the fixed managed sidecar runtime
  installation root and atomic pointer writes without making it a generic
  cleanup category.
- `synthesis-invariant-guardrails`: Adds packaging and installer dependency
  guards while preserving the in-process production topology and `108 methods /
  1 direct consumer` inventory.
- `synthesis-layer-doc-system`: Documents the packaged-but-not-launched runtime
  as implemented current state.

## Impact

- New environment-neutral exports in `packages/synthesis-contracts`.
- New plugin-side manifest and installer modules under `src/modules`.
- New Synthesis runtime build/package/release scripts and a platform prebuild
  workflow.
- New generated assets under `addon/bin/synthesis-sidecar`.
- Focused Core 193 packaging/install tests plus platform, boundary, invariant,
  build, and documentation gates.
- No dependency installation, public `SynthesisClient` method, UI, preference,
  database schema, service inventory, subprocess launch, or production
  composition change.
