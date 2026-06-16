# Expand Host Bridge CLI Prebuild CI

## Why

The bundled `zotero-bridge` CLI is currently built and packaged for a small
platform set. Linux users on 32-bit x86, 32-bit ARM, and ARM64 hosts cannot rely
on the bundled binary resolver, and the release workflow does not describe a
repeatable Linux cross-build path.

## What Changes

- Add a Host Bridge CLI prebuild matrix covering `win32-x64`, `darwin-x64`,
  `darwin-arm64`, `linux-x86`, `linux-x64`, `linux-arm`, and `linux-arm64`.
- Use `cargo-zigbuild` for Linux cross-builds and keep macOS binaries built on
  GitHub macOS runners.
- Extend packaging so a Rust target triple can be passed explicitly and copied
  from `target/<triple>/release/`.
- Extend runtime platform resolution so Linux architecture selects the matching
  bundled CLI directory.
- Add a branch publisher for embedding the prebuilt CLI bundle and
  `zotero-bridge-cli` wrapper skill in other projects without vendoring the
  full plugin repository.

## Impact

- Affects Host Bridge CLI build scripts, release workflow, bundled binary
  resolution, bundle publishing, and packaging tests.
- Does not change Host Bridge HTTP protocol, CLI command behavior, approval
  routing, or user-level CLI installation locations.
