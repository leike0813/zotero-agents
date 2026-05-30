## Why

The current Synthesis Layer documentation set has grown into a dense network of 27 Markdown files, 8 YAML contracts, diagrams, and cross-document definitions. The same concepts appear in multiple places, which makes drift likely and has already led to over-engineered contracts that do not match the single-process Zotero plugin runtime.

The project needs a smaller canonical documentation set that preserves the latest design decisions while making future updates cheap and traceable.

## What Changes

- Archive the existing `doc/synthesis-layer` tree under `doc/deprecated/synthesis-layer-legacy-20260531/`.
- Recreate `doc/synthesis-layer` with a compact set of canonical Markdown documents and two small YAML contract files.
- Preserve executable contracts that affect implementation correctness, including identity generation, Discovery scoring, Reference Resolution, routing, rebuild, drift, review, persistence, and performance budgets.
- Consolidate duplicated governance/engineering concepts into single ownership locations.
- Remove distributed-system concepts from active design docs unless explicitly marked as not adopted.
- Update external project-doc references to the new documentation entry points.
- Mark the previous Synthesis governance/engineering documentation changes as superseded by this consolidation.

## Capabilities

### New Capabilities

- `synthesis-layer-doc-system`: Defines the canonical documentation structure, maintenance rules, active design anchors, and reduced machine-readable contract surface for the Synthesis Layer.

### Modified Capabilities

- `synthesis-layer-governance`: Superseded by the consolidated documentation set.
- `synthesis-layer-engineering-contracts`: Superseded by the consolidated documentation set.

## Impact

- Documentation-only change.
- No runtime code changes.
- No data migration.
- No dependency upgrades.
- Future Synthesis changes should cite `doc/synthesis-layer/README.md` and the consolidated documents instead of the deprecated split tree.
