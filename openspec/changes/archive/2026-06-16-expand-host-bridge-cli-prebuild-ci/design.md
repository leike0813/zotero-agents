# Design

## Build Matrix

The platform directory is the plugin-facing contract. Each platform maps to one
Rust target:

| Platform | Rust target | Builder |
| --- | --- | --- |
| `win32-x64` | `x86_64-pc-windows-msvc` | native Windows CI |
| `darwin-x64` | `x86_64-apple-darwin` | native macOS x64 CI |
| `darwin-arm64` | `aarch64-apple-darwin` | native macOS arm64 CI |
| `linux-x86` | `i686-unknown-linux-gnu` | `cargo-zigbuild` |
| `linux-x64` | `x86_64-unknown-linux-gnu` | `cargo-zigbuild` |
| `linux-arm` | `armv7-unknown-linux-gnueabihf` | `cargo-zigbuild` |
| `linux-arm64` | `aarch64-unknown-linux-gnu` | `cargo-zigbuild` |

macOS binaries are CI-only outputs for this change. Local Windows prebuilds may
produce Linux targets when Zig and `cargo-zigbuild` are already installed.

## Packaging

The package step accepts both `platform` and Rust target triple. When a target
is supplied, it reads the binary from `cli/zotero-bridge/target/<triple>/release/`
and writes it to `addon/bin/<platform>/` with a sibling `.sha256` file.

The build helper checks for `cargo zigbuild --version` before Linux builds and
fails with an actionable diagnostic. It does not install local developer
tooling.

## Runtime Resolution

The resolver keeps the existing priority order:

1. `ZOTERO_BRIDGE_CLI`
2. bundled binary
3. `PATH`

Only the bundled platform directory mapping changes. Linux arch values map to
`linux-x86`, `linux-x64`, `linux-arm`, or `linux-arm64`; missing Linux arch
falls back to `linux-x64`.

## Bundle Branch Publishing

A dedicated publisher creates an orphan branch containing only the embeddable
Host Bridge bundle:

- `bin/<platform>/zotero-bridge(.exe)` plus `.sha256` files
- `skills/zotero-bridge-cli/`
- `manifest.json`
- `README.md`

The script copies from the current working tree but only from these allowlisted
source roots. Dirty worktrees are rejected by default and require an explicit
`-AllowDirty` flag. `-Push` is opt-in so local verification can update the
branch without remote side effects.
