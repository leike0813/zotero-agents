## MODIFIED Requirements

### Requirement: Sidecar prebuilds SHALL be exact content-addressed sets

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives, a complete archive-digest manifest,
and a `synthesis-sidecar-runtime-prebuild-result.v2` document that binds the
run, request, source, build fingerprint, aggregate, prebuild commit, immutable
set path, cache-hit targets, cache-miss targets, and cache source runs.

#### Scenario: A verified set is synchronized
- **WHEN** synchronization receives a v2 result and its declared immutable set
- **THEN** the result identity, exact seven-target cache partition, set
  manifest, archive digests, and bundle manifests SHALL all validate
- **AND** an unknown field, incomplete cache partition, duplicate target, or
  mismatched identity SHALL fail before add-on bytes are replaced

#### Scenario: Linux ARM64 is built on its native runner
- **WHEN** the manual seven-target prebuild builds `linux-arm64`
- **THEN** it SHALL compile `aarch64-unknown-linux-gnu` directly with Cargo,
  SHALL not install or invoke Zig/cargo-zigbuild for that matrix member, and
  SHALL run its native smoke before the archive is accepted

#### Scenario: A Linux target needs cross compilation
- **WHEN** the manual seven-target prebuild builds `linux-x86`, `linux-x64`, or
  `linux-arm`
- **THEN** it SHALL use the recipe-pinned Zig and cargo-zigbuild construction
  path without installing `gcc-multilib` or `gcc-arm-linux-gnueabihf`

#### Scenario: A verified set is finalized into source main
- **WHEN** formal release finalization restores the exact seven-target set
- **THEN** it SHALL update only `addon/bin/<target>/synthesis-sidecar/` for the seven declared targets
- **AND** it SHALL preserve sibling native binaries and reject the obsolete sidecar-first root
