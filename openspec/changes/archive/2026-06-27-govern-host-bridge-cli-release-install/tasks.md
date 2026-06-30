# Tasks

## 1. CLI Version Governance

- [x] Add CLI release manifest schema and fingerprint script.
- [x] Add patch-bump and binary-checksum recording commands.
- [x] Update package scripts for governance commands.
- [x] Gate full CLI matrix workflow on fingerprint changes or explicit dispatch.
- [x] Commit Cargo version, Cargo lock, and release manifest updates from `main` CI.

## 2. Surface/Profile Publishing

- [x] Remove wrapper/profile/broker/docs-only paths from the CLI build workflow trigger.
- [x] Add a surface-only workflow that syncs latest prebuilds and publishes wrapper/profile surfaces without rebuilding the CLI.
- [x] Update release pipeline skill/docs to describe the current workflow split.

## 3. Installer Runtime

- [x] Install only the bundled current-platform binary from the current XPI/addon package, except explicit env overrides.
- [x] Compare source/target SHA-256 before copy.
- [x] Overwrite stale targets and return a stable busy error when replacement fails.
- [x] Return changed/hash/permission diagnostics.
- [x] Restore POSIX executable bits after install through Node or Zotero/XPCOM chmod paths.

## 4. Verification

- [x] Run Host Bridge CLI packaging/install tests.
- [x] Run Host Bridge doc sync check.
- [x] Run zotero-librarian profile check.
- [x] Run lint check.
