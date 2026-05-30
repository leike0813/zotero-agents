## Why

This change is superseded by `synthesis-layer-doc-consolidation`.

The original change created a separate machine-oriented engineering contract layer. The intent remains valid, but the resulting document/YAML surface was too large for the local Zotero plugin runtime and created maintenance drift risk.

## What Changes

- Keep this change only as historical context.
- Treat the reduced consolidated YAML contracts as the active machine-readable surface.
- Do not add new requirements to this superseded change.

## Capabilities

### New Capabilities

- `synthesis-layer-engineering-contracts`: Superseded historical documentation capability.

### Modified Capabilities

- `synthesis-layer-doc-system`: The consolidated documentation system replaces this split engineering contract layer.

## Impact

- Documentation history only.
- No runtime impact.

