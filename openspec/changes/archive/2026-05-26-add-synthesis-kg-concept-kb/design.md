## Context

Foundation supplies canonical transactions and projection registry state. Topic synthesis now persists structured artifacts and can emit sidecars for topic graph proposals. Concept KB extends the same pattern to concept cards, keeping agents limited to proposals while the plugin owns IDs, validation, merge decisions, canonical writes, and UI projection.

## Goals / Non-Goals

**Goals:**

- Store Concept, Sense, Alias, Relation, manifest, tombstone, and topic concept-link files under the Synthesis canonical store.
- Ingest topic synthesis concept card proposals without blocking main artifact persistence.
- Provide exact-alias and lightweight token-overlap candidate matching.
- Provide a rebuildable JSON `concept-kb-index` projection for search and dynamic overlay.
- Add Concepts tab and non-destructive concept bubble overlay.

**Non-Goals:**

- No embedding, mention locator sidecar, source artifact rewriting, complex merge UI, Git remote sync, Citation Registry rewrite, external MCP tools, or real SQLite/FTS backend.

## Decisions

1. **Agent writes proposals only.**  
   Topic synthesis may write `runtime/payloads/concept-cards-proposal.json` and final bundles may reference it through `concept_cards_proposal_path`. Agents do not provide canonical concept IDs or write canonical files.

2. **Projection stays JSON/DTO for v1.**  
   The projection target is `concept-kb-index`, recorded in Foundation projection registry. This phase writes `state/concept-kb-index.json` and keeps the service facade stable for a later SQLite/FTS backend.

3. **Ingestion failures are non-blocking.**  
   Malformed or ambiguous proposal rows write sanitized diagnostics and warnings. Topic synthesis apply remains successful unless existing final bundle or structured artifact validation fails.

4. **Edits are display-text only.**  
   Concepts page direct edits are limited to `short_definition`, `definition`, `usage_note`, and `editorial_note`. Identity, aliases, relations, source refs, status, and provenance remain read-only.

5. **Overlay does not rewrite source text.**  
   UI dynamically links high-confidence, unambiguous aliases, longest first, and skips code/pre/JSON/math/existing links. Clicking a link opens a bubble without navigation.

## Risks / Trade-offs

- **False concept merges are harmful** -> exact alias can merge; weak token overlap becomes diagnostics/review rather than silent merge.
- **Overlay noise** -> ambiguous or low-confidence matches are not linked automatically, and overlay can be disabled in UI state.
- **Projection backend will change later** -> use a JSON DTO now and keep service-facing shapes stable.

## Migration Plan

1. Create Concept KB service and canonical defaults.
2. Extend topic synthesis bundle/runtime with optional concept card proposal sidecar.
3. Ingest proposals after successful topic artifact persistence and write topic concept links.
4. Add Workbench Concepts state/UI and overlay DTO helpers.
5. Keep existing topic artifact files intact; concept links are additive.
