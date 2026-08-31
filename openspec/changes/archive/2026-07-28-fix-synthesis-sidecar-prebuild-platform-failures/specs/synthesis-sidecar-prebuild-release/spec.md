## MODIFIED Requirements

### Requirement: Sidecar prebuilds SHALL be exact content-addressed sets

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives, a complete archive-digest manifest,
and a result document using `synthesis-sidecar-runtime-prebuild-result.v1`.
The sole manually dispatched prebuild workflow SHALL derive its seven target
builds and pinned Linux Zig/cargo-zigbuild toolchain from one checked-in
sidecar build recipe, and SHALL NOT depend on runner-installed cross-GCC apt
packages.

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
