## Why

Staged promotion can currently persist two canonical tags that differ only by case in one batch. The stricter public read path then rejects the vocabulary, leaving the Tags workbench unavailable until the invalid aggregate is repaired.

## What Changes

- Make staged promotion select one canonical spelling per case-insensitive tag group, merge its parent bindings, consume all promoted variants, and report non-winning variants as skipped.
- Enforce case-insensitive canonical uniqueness at the shared vocabulary validation boundary.
- Repair historical case-colliding canonical groups during startup through one atomic, retryable application operation while allowing sidecar readiness when repair fails.
- Rebuild only affected pending Host tag effects against each repaired winner and preserve terminal effect receipts.
- Cover promotion, repair, rollback, readiness, and cold-reopen behavior at public application and real-process boundaries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-tag-vocabulary`: Define case-insensitive canonical uniqueness, grouped staged promotion, and best-effort startup repair behavior.
- `synthesis-native-tag-surface`: Require the native surface to remain readable across grouped promotion and historical repair, including restart behavior.

## Impact

The change is limited to the Rust Synthesis tag-vocabulary application, its existing repository transaction adapter, production startup composition, focused Rust/process tests, and the current Synthesis architecture documentation. Public TypeScript/HTTP DTOs, capability catalogs, database schema version, and release artifacts do not change.
