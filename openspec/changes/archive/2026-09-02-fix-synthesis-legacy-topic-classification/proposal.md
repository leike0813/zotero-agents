## Why

Legacy Topic Graph rows that intentionally have no canonical current artifact are currently compared as though every graph node were a materialized Topic. A valid placeholder, stale Planned Topic, or deleted Topic can therefore stop the entire Synthesis sidecar before discovery even though the legacy source is structurally supported and no data is corrupt.

## What Changes

- Classify legacy Topic Graph rows into canonical-bearing and graph-only inventories before canonical preflight.
- Allow known graph-only Topic metadata to remain byte-for-byte in the legacy canonical source without requiring a current artifact or blocking migration.
- Continue to reject unknown graph states, orphan canonical identities, missing materialized Topic snapshots, and invalid canonical content before any migration write.
- Show an actionable manual-recovery message that states existing Synthesis data was not replaced and preserves the stable reason code for diagnostics.
- Lock the behavior through repository classification tests and a real native `serve` startup/migration test.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-legacy-production-migration`: Define the closed legacy Topic state classification and tolerate known graph-only Topic sources without weakening fail-closed handling for unknown or conflicting data.
- `synthesis-tab-ui`: Explain data-preserving manual recovery for deterministic migration incompatibility while retaining diagnostics and explicit retry.

## Impact

This affects the Rust legacy repository classifier, canonical preflight, native startup composition, process-level migration tests, Workbench failure copy, localization, and migration documentation. It does not change the database schema, canonical file format, public wire contract, dependencies, runtime packaging, prebuilds, or release state.
