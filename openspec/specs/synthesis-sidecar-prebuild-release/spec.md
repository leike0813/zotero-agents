# synthesis-sidecar-prebuild-release Specification

## Purpose

Defines the exact seven-platform, content-addressed prebuild set and result
evidence required before Synthesis sidecar binaries can be synchronized.

## Requirements

### Requirement: Sidecar prebuilds SHALL be exact content-addressed sets

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives, a complete archive-digest manifest,
and a result document using `synthesis-sidecar-runtime-prebuild-result.v2`
with an explicit cache-hit, cache-miss, and source-run summary.
The sole manually dispatched prebuild workflow SHALL derive its seven target
builds and pinned toolchain construction from one checked-in sidecar build
recipe. Linux cross-build targets `linux-x86`, `linux-x64`, and `linux-arm`
SHALL use the recipe-pinned Zig/cargo-zigbuild construction; `linux-arm64`
SHALL build natively on its Linux ARM64 runner with Cargo and SHALL retain its
native smoke. The workflow SHALL NOT depend on runner-installed cross-GCC apt
packages.

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
