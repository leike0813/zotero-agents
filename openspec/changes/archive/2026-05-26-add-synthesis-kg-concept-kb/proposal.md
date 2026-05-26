## Why

Synthesis KG now has the canonical store foundation, tag vocabulary, and topic graph, but it still lacks a shared concept layer for terms, senses, aliases, and lightweight definitions. Concept KB is the next roadmap phase because topic synthesis already has structured outputs where concept cards can be proposed, and Workbench readers need non-destructive concept links and bubbles.

## What Changes

- Add a Concept KB domain backed by canonical files under `synthesis/concepts/`.
- Add concept card proposal ingestion from topic synthesis into plugin-owned concept, sense, alias, relation, and topic concept-link files.
- Add a rebuildable `concept-kb-index` JSON projection for search, alias lookup, and overlay DTOs.
- Extend topic synthesis final bundles with optional `concept_cards_proposal_path`.
- Add Concepts Workbench tab, concept detail/read-only identity inspector, display-text edit action, and dynamic overlay/bubble support.
- Do not implement embedding, mention locator sidecars, source artifact rewriting, complex merge UI, Git Sync, Citation Registry rewrite, external MCP tools, or real SQLite/FTS storage.

## Capabilities

### New Capabilities

- `synthesis-concept-kb`: Concept / Sense / Alias / Relation canonical model, proposal ingestion, topic links, projection, diagnostics, and overlay DTO behavior.

### Modified Capabilities

- `synthesize-topic-workflow`: Topic synthesis may emit `stage_5_5_concept_cards` sidecars and final bundles may reference them.
- `topic-synthesis-structured-artifact`: Concept cards remain sidecar proposal artifacts and are not structured topic artifact source sections.
- `synthesis-workbench-ui`: Workbench exposes Concepts tab and concept overlay/bubble behavior.

## Impact

- Affects Synthesis service internals, topic synthesis result validation/apply, create/update topic synthesis skill packages, Workbench UI model/app, and focused tests.
- Adds no npm dependency and no new public MCP or host bridge surface.
- Uses Foundation canonical transaction, diagnostics, and projection registry helpers.
