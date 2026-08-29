## Why

Seven-platform Synthesis sidecar prebuilds are a routine development input, but
the current workflow refuses to build until an unrelated release-verification
receipt already exists. A deterministic Node/Rust parity mismatch therefore
blocks construction, even when every native platform can build and run. The
same pipeline also mixes verification, prebuild, resolver, synchronization,
and release identities, so unrelated orchestration edits invalidate evidence.

## What Changes

- Make the manual seven-platform prebuild produce build-only immutable evidence
  without resolving release verification.
- Join build evidence with a trusted three-host verification receipt only while
  preparing the formal release set.
- Split verification, prebuild, and release pipeline revisions so each identity
  covers only its actual producer or consumer inputs.
- Add one development command that dispatches or resumes an exact prebuild,
  verifies its immutable set, synchronizes the seven local bundles, and reports
  release-verification status without treating it as build failure.
- Make publication and synchronization bind the exact immutable-set commit,
  tolerate append-only branch advancement, and recover from concurrent
  non-fast-forward publication without force pushing.
- Treat Rust-owned repository migration markers as private implementation state
  in Node/Rust application parity while retaining Rust-owned schema tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-prebuild-release`: Separate build-only prebuild evidence
  from formal release verification and define their release-set join.
- `synthesis-rust-typed-application-parity-harness`: Compare shared observable
  state without treating Rust-private schema markers as Node-owned state.

## Impact

- Affects Synthesis sidecar workflow orchestration, evidence schemas, governed
  identities, local synchronization, release preparation, tests, Skills, and
  packaging documentation.
- Does not weaken formal release verification, publish a plugin, change runtime
  protocol behavior, synchronize Gitee, or authorize a remote dispatch.
