# Add Synthesis Citation Graph

## Why

Topic synthesis and later review workflows need a deterministic citation
substrate that unifies library-to-library citations, external references,
unresolved references, and existing citation role annotations. This graph must be
rebuildable from metadata and derived artifacts rather than inferred by an LLM.

## What Changes

- Add a Unified Citation Graph builder for library papers, external references,
  unresolved references, citation edges, role projection, and promotion.
- Add deterministic provisional reference key generation.
- Aggregate repeated source-target citations into one edge with mention count.
- Select `primary_role` from existing role evidence and preserve aux roles.
- Add deterministic layout snapshot generation for compact/balanced/expanded
  presets.
- Exclude MCP exposure, graph UI rendering, and Sigma.js integration from this
  change.

## Capabilities

### New Capabilities

- `synthesis-citation-graph`: Deterministic Unified Citation Graph projection
  and layout snapshot generation.

### Modified Capabilities

None.

## Impact

- Adds citation graph modules under `src/modules/synthesis/`.
- Adds graph/layout dependencies needed for deterministic layout computation.
- Adds core tests for provisional keys, promotion, edge aggregation, role
  selection, and layout determinism.
- Does not add UI, MCP tools, or agent-driven graph construction.
