# Design

## CLI Build Fingerprint

The build fingerprint covers only files that can affect CLI binary output:

- Rust package files under `cli/zotero-bridge`, including `Cargo.toml`, `Cargo.lock`, and `src/**`.
- CLI package/build scripts.
- The CLI build workflow and build matrix.
- The governance script itself.

The fingerprint excludes Host Bridge wrapper skill content, profile repository files, broker registry code, surface catalog rendering, and documentation-only release scripts.

`cli/zotero-bridge/release.json` records the latest released fingerprint, Cargo version, and checksums for platform prebuilds. `Cargo.toml` remains the version SSOT.

## CI Bump Flow

On PRs, CI detects whether the fingerprint differs and reports the status without committing. On `main`, a changed fingerprint causes the workflow to patch-bump `Cargo.toml`, synchronize the matching `Cargo.lock` package entry, build the prebuild matrix, record binary checksums in `release.json`, and commit those governance files.

The follow-up bump commit has a matching manifest fingerprint, so the next workflow detect job skips the expensive build.

## Installer Flow

The preferences installer resolves the current-platform bundled binary from the XPI/addon package. PATH-resolved binaries are only diagnostics and are not used as install sources.

Before writing, the installer computes SHA-256 for source and target. Equal hashes skip content copying but still run POSIX chmod. Different hashes overwrite the target. If overwrite fails because the target cannot be removed or replaced, the installer returns `cli_install_target_busy`.

POSIX installs require executable permission restoration after copy because byte-copy APIs do not preserve source file mode. Windows skips chmod.
