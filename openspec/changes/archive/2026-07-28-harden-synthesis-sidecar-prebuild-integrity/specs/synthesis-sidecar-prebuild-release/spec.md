## MODIFIED Requirements

### Requirement: Sidecar prebuilds SHALL be exact content-addressed sets

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives, a complete archive-digest manifest,
and a result document using `synthesis-sidecar-runtime-prebuild-result.v1`.
The sole manually dispatched prebuild workflow SHALL derive its seven target
builds and pinned Linux Zig/cargo-zigbuild toolchain from one checked-in
sidecar build recipe, and SHALL NOT depend on runner-installed cross-GCC apt
packages. The workflow SHALL only build a `source_sha` equal to its dispatch
revision, SHALL compile every worker with that source's Rust fingerprint, and
SHALL validate the exact archive set and each extracted bundle's target, build
fingerprint, source provenance, manifest, and file digests before publishing
the aggregate.

#### Scenario: A requested result identifies another run or source
- **WHEN** synchronization is given a result whose request ID, run ID, source
  SHA, aggregate, set path, repository, or workflow differs from the requested
  identity
- **THEN** it SHALL reject the result before replacing any addon file

#### Scenario: Linux cross-build runners lack distribution cross-GCC packages
- **WHEN** the manual seven-target prebuild builds a Linux target
- **THEN** it SHALL use the recipe-pinned Zig and cargo-zigbuild construction
  path and SHALL continue without installing `gcc-multilib` or
  `gcc-arm-linux-gnueabihf`

#### Scenario: A dispatch requests a source different from its workflow revision
- **WHEN** a manual prebuild supplies a `source_sha` that is not the exact
  commit selected by the workflow dispatch ref
- **THEN** the plan job SHALL fail before any matrix build starts

#### Scenario: A worker was compiled without its Rust source fingerprint
- **WHEN** a native-smoke target starts a worker from a candidate bundle
- **THEN** its ready frame SHALL report the bundle provenance source fingerprint
  and the candidate SHALL be rejected when it does not

#### Scenario: Downloaded prebuild artifacts are incomplete or malformed
- **WHEN** the publish job receives missing, duplicate, unexpected, unsafe, or
  source-mismatched target archives
- **THEN** it SHALL reject them before creating an aggregate or writing the
  prebuild branch
