## Why

The Rust Synthesis sidecar only recognizes one exact TypeScript repository shape, so direct upgrades from older releases and known pre-release development schemas fail before discovery with little actionable evidence. The migration and supervision path must accept known historical variants without losing durable data, while still rejecting unknown repository shapes before any write.

## What Changes

- Classify the supported legacy release and development schema variants by their observable tables and columns, then normalize them through one validated Rust repository publication.
- Advance the Rust repository foundation to v3 and preserve development-era topic planning plus discovery screening facts instead of silently dropping them.
- Complete the native Planned Topic workflow, including planned filtering, planning context, compare-and-set plan application, and discovery outcome ingestion.
- Make child exit compete with discovery, preserve stable startup failure codes in production, stop retries after the terminal fuse, and provide an explicit recover path.
- Expose bounded startup phases and safe diagnostics in production while retaining raw process tails only in debug mode.
- Keep a persistent, actionable Workbench startup failure state and expose the same safe summary through Task Manager.
- Extend migration acceptance with release-family fixtures, development-schema fixtures, process-level tests, and an isolated copy of the configured real profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-legacy-production-migration`: Accept known release and development variants through staged, validated, single-publication migration while preserving durable facts.
- `synthesis-production-owner-cutover`: Define native v3 initialization and deterministic recovery ownership for failed production startup.
- `synthesis-sidecar-runtime-supervision`: Race process exit with discovery, expose stable terminal causes, and make retry/fuse/recover behavior authoritative.
- `synthesis-native-topic-workbench-surface`: Add native Planned Topic planning and discovery screening operations to the public topic surface.
- `synthesis-sidecar-debug-observability`: Add bounded production-safe startup observations and debug-only raw process evidence.
- `synthesis-tab-ui`: Keep startup failures visible with retry and diagnostics actions until recovery succeeds.

## Impact

This affects the Rust repository schema and migration code, topic applications and runtime routes, cross-language contracts and generated contract metadata, plugin-side clients and workflow host APIs, production sidecar supervision, Workbench/Task Manager UI, localization, and the migration/lifecycle test suites. It does not dispatch a sidecar prebuild or release and does not change third-party dependencies.
