## Why

The Synthesis sidecar prebuild repeatedly fails after small patches because one
seven-target workflow mixes host-level source verification, platform packaging,
and release evidence, while Rust tests independently manage temporary storage and
often reveal only the first failing test binary. The pipeline needs stable test
ownership and separate source, build, verification, and orchestration identities
so unrelated verification changes do not invalidate healthy native artifacts.

## What Changes

- Introduce one shared Rust test-root owner and deterministic synchronization for
  platform-sensitive repository, process, and concurrency tests.
- Add an automatic Linux, Windows, and macOS source-verification workflow that
  emits a trusted receipt only after all three hosts pass without fail-fast.
- Make the manually dispatched seven-target prebuild consume that receipt and run
  only target build, packaging, archive validation, and applicable native smoke.
- Centralize source, build, verification, and pipeline identity calculation and
  reuse prior target artifacts across source SHAs only after exact fingerprint,
  manifest, and digest validation.
- Replace release-eligible prebuild result v2 with strict result v3 per-target
  evidence. Retain v1/v2 parsing for read-only audit, but reject legacy results
  from synchronization and release preparation.
- Update the current Synthesis prebuild/release Skills and the pending R9a
  prebuild requirement to consume the new evidence chain.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-prebuild-release`: Require trusted three-host verification,
  target-scoped build/smoke work, exact cross-SHA reuse, and result v3 evidence.
- `synthesis-rust-sidecar-migration-governance`: Require shared test resource
  ownership, deterministic synchronization, and no-fail-fast three-host evidence.

## Impact

This changes the Synthesis Rust workspace test support, prebuild and verification
workflows, release-governance/cache/stage/sync scripts, packaging contract tests,
OpenSpec artifacts, and the two Synthesis sidecar operational Skills. It adds no
third-party dependency, does not change the product wire interface, and does not
authorize a formal release or Gitee synchronization.
