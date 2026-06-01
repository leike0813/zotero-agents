## Why

Discovery hints are suggestions, not topic update consumption records. The
older `accepted` state creates broken UX because accepting a hint does not
rewrite a topic. The older `filtered` state also conflates policy suppression
with durable user rejection.

## What Changes

- Restrict discovery hint states to `open`, `rejected`, and `superseded`.
- Provide user reject/restore behavior only.
- Preserve rejected hint suppression across digest rerun, metadata drift, and
  Registry rebuild.
- Normalize legacy `filtered` and `accepted` values.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-paper-registry`: Discovery hint state storage and repair behavior.
- `synthesis-workbench-ui`: Discovery hint action surface.

## Impact

Affected implementation includes repository discovery hint normalization,
discovery summary generation, Workbench actions/UI, and repository/UI tests.
