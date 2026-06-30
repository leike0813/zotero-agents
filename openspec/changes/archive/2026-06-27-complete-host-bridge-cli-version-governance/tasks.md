# Tasks

## 1. Release Freshness

- [x] Add a freshness script for manifest fingerprint and binary checksum validation.
- [x] Add an npm script for the freshness check.
- [x] Run the freshness check in `release.yml` before `test:gate:release`.
- [x] Keep `scripts/run-ci-gate.ts` unchanged.

## 2. Startup Install Prompt

- [x] Add a runtime helper that detects missing/stale/current/unavailable CLI install target state.
- [x] Persist declined bundled CLI identity.
- [x] Prompt on startup after the main window is available.
- [x] Reuse `installHostBridgeCli` for confirmed installs.

## 3. Specs and Docs

- [x] Add delta specs for CLI interface and release pipeline behavior.
- [x] Update Host Bridge release pipeline skill with the release freshness check.

## 4. Verification

- [x] Run Host Bridge CLI packaging/install tests.
- [x] Run CLI prebuild freshness check.
- [x] Run Host Bridge doc sync check.
- [x] Run zotero-librarian profile check.
- [x] Run lint check.
- [x] Run TypeScript check.
