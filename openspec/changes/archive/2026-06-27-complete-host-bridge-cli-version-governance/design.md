# Design

## Release Freshness

The freshness script compares the current governance fingerprint with `cli/zotero-bridge/release.json`, then validates every restored `addon/bin/<platform>/<binary>` file against its `.sha256` sidecar and release manifest entry. The script runs directly in `.github/workflows/release.yml` after prebuild assets are downloaded and before `npm run test:gate:release`.

## Startup Prompt

Startup detection examines only the install target returned by `resolveHostBridgeCliInstallTarget`. It reads the current-platform bundled binary from the running package, computes its SHA-256, and compares that hash with the target file if present.

The prompt states whether the target is missing or stale, shows the target path, and includes bundled version/hash diagnostics. If the user confirms, it calls `installHostBridgeCli`. If the user declines, the bundled CLI identity is persisted and the same identity is not prompted again.

The identity is `version:sha256` when version metadata is available and `sha256:<hash>` otherwise.
