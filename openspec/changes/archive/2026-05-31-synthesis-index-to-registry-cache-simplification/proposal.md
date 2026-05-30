## Why

After Topics were decoupled from Index rebuilds and Zotero external drift was bounded at the ingress layer, the remaining “Index as Synthesis foundation” model is heavier than the system needs. The architecture should keep the useful registry and citation graph capabilities, but stop treating Index as the global base layer for every Synthesis domain.

## What Changes

- Reframe Index / Literature Registry as a rebuildable **Paper Registry Cache** domain, not the Synthesis-wide source of truth.
- Limit the cache role to Zotero-bound literature summaries, bindings, artifact readiness, reference instances/resolutions, cleanup/review surfaces, Citation Graph inputs, and debug/maintenance summaries.
- Document Topic, Tag, Concept, and explicit workflow artifact domains as independent owners of their facts; they may read Host Library / Artifact Facade inputs and optional graph metrics, but they do not depend on registry cache rebuild completion.
- Reframe “full Index rebuild” as “full registry/graph cache rebuild” in target contracts while tolerating current implementation names during migration.
- Tighten event, rebuild, runbook, and invariant documents so registry cache work cannot fan out into topic source-check, discovery, tag, or concept work.

## Capabilities

### New Capabilities

- `synthesis-index-to-registry-cache-simplification`: Documents the simplified Synthesis architecture where the former Index role is narrowed to a rebuildable registry/graph cache boundary.

### Modified Capabilities

- None.

## Impact

- Affects Synthesis architecture, governance, trigger, rebuild, event, runbook, state catalog, and diagram documentation.
- Does not change plugin runtime code in this change.
- Does not perform data migration or alter `literature-digest`.
- Future implementation can use this contract to rename UI/actions gradually and remove registry-cache fan-out assumptions without changing Topic workflow contracts.
