## 1. OpenSpec Contract

- [x] Add proposal, design, tasks, and Host Bridge CLI interface delta spec.

## 2. Build And Packaging

- [x] Extend package script to accept platform and Rust target triple.
- [x] Add a local build helper that uses `cargo-zigbuild` for Linux targets.
- [x] Update GitHub Actions matrix for all supported Host Bridge CLI platforms.
- [x] Add addon binary placeholder directories for new Linux platforms.

## 3. Runtime Resolution

- [x] Map Linux x86, x64, arm, and arm64 architectures to stable bundled
  platform directories.
- [x] Preserve environment override, bundled lookup, and PATH fallback order.

## 4. Verification

- [x] Extend focused packaging tests for platform mapping, CI matrix, and target
  triple package source paths.
- [x] Run `cargo test --manifest-path cli/zotero-bridge/Cargo.toml`.
- [x] Run packaged/current `zotero-bridge --help`.
- [x] Run focused packaging test.
- [x] Run `npx tsc --noEmit`.
- [x] Run `openspec validate expand-host-bridge-cli-prebuild-ci --strict`.
- [x] Run `git diff --check`.

## 5. Bundle Branch Publishing

- [x] Add a publisher script for the prebuilt CLI bundle and wrapper skill.
- [x] Run publisher dry run.
- [x] Run local branch publish without pushing.
