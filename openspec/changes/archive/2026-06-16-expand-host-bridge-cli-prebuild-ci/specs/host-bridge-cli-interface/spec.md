## ADDED Requirements

### Requirement: Host Bridge CLI prebuild covers supported desktop targets

The plugin SHALL provide a repeatable Host Bridge CLI build and packaging path
for the supported bundled platform directories.

#### Scenario: Release workflow builds all supported CLI bundles

- **WHEN** the Host Bridge CLI release workflow runs
- **THEN** it SHALL build and package `win32-x64`, `darwin-x64`,
  `darwin-arm64`, `linux-x86`, `linux-x64`, `linux-arm`, and `linux-arm64`
  bundles
- **AND** Linux bundles SHALL be built with `cargo-zigbuild`
- **AND** macOS bundles SHALL be built on GitHub macOS runners.

#### Scenario: Package step accepts explicit Rust target

- **WHEN** the package step receives a platform and Rust target triple
- **THEN** it SHALL copy the binary from
  `cli/zotero-bridge/target/<triple>/release/`
- **AND** it SHALL write the binary and `.sha256` checksum into
  `addon/bin/<platform>/`.

#### Scenario: Runtime resolves Linux bundled CLI by architecture

- **WHEN** the plugin resolves a bundled CLI on Linux
- **THEN** `x86` or `ia32` SHALL resolve to `linux-x86`
- **AND** `x64` SHALL resolve to `linux-x64`
- **AND** `arm` SHALL resolve to `linux-arm`
- **AND** `arm64` or `aarch64` SHALL resolve to `linux-arm64`.

### Requirement: Host Bridge CLI bundle is publishable as an isolated branch

The repository SHALL provide a script that publishes the prebuilt Host Bridge
CLI binaries and wrapper skill as an isolated Git branch for embedding in other
projects.

#### Scenario: Publisher materializes embeddable bundle

- **WHEN** the Host Bridge CLI bundle publisher runs
- **THEN** it SHALL create an orphan commit containing `bin/`, `skills/`,
  `manifest.json`, and `README.md`
- **AND** `skills/` SHALL include the `zotero-bridge-cli` wrapper skill
- **AND** `bin/` SHALL include only platform CLI binaries and checksum files
  copied from the current bundled CLI directory.

#### Scenario: Publisher protects unrelated workspace changes

- **WHEN** the working tree has unrelated changes
- **THEN** the publisher SHALL fail unless explicitly allowed to publish from a
  dirty working tree
- **AND** even when dirty publication is allowed, it SHALL only copy the Host
  Bridge bundle allowlist.
