## Context

The Synthesis KG foundation change added the canonical `synthesis/` directory layout, JSON asset validation, transaction receipts, diagnostics, store-change events, and projection registry state. Tag vocabulary remains primarily managed by the legacy tag-manager workflow through prefs-backed state, while tag-regulator materializes `valid_tags` from that prefs state.

The tag vocabulary domain is the lowest-coupling KG domain after foundation. It can validate canonical store writes, projection state, UI integration, and workflow consumption before Topic Graph, Concept KB, Citation Graph, or Git Sync are implemented.

## Goals / Non-Goals

**Goals:**

- Store TagVocab-compatible canonical vocabulary in `synthesis/tags/`.
- Provide deterministic validation, import merge preview, export, diagnostics, and transaction receipts.
- Expose a rebuildable `tag-index` projection model through the foundation projection registry.
- Add a Tags page to the Synthesis Workbench as the primary management path.
- Make tag-regulator prefer the Synthesis canonical export while preserving existing prefs fallback.

**Non-Goals:**

- No Topic Graph, Concept KB, Citation Graph, Git remote sync, marketplace, package registry, or multi-source subscription.
- No real SQLite schema or migration in this phase.
- No removal of the legacy tag-manager workflow.
- No new external MCP or host bridge surface beyond internal workflow host API access.

## Decisions

1. **Canonical files use foundation transactions.**  
   The new tag vocabulary service writes vocabulary, aliases, abbrev, protocol, and manifest through the existing foundation transaction helper. This keeps receipt, diagnostic, event, and projection-stale behavior consistent with other KG domains.

2. **Projection is a rebuildable JSON/DTO model in v1.**  
   The design shard names `tag-index.sqlite`, but the repo does not have a plugin-safe SQLite projection abstraction for this domain. This change records `tag-index` in the foundation projection registry and stores rebuildable lookup/search DTO state without adding dependencies. A later SQLite backend can replace the projection implementation behind the same service facade.

3. **Synthesis canonical state is preferred, prefs state is fallback.**  
   Tag-regulator will first call `runtime.hostApi.synthesis.exportTagVocabularyForRegulator()`. If that method is missing, fails, or returns no usable tags, buildRequest keeps using the existing prefs vocabulary loader. This preserves current workflow behavior and tests while allowing canonical state to become the main path.

4. **Import produces preview before mutation.**  
   Import normalizes TagVocab-compatible payloads and reports additions, unchanged rows, and conflicts. Conflicting imports do not mutate canonical state until the caller applies an explicit action.

5. **Workbench UI consumes snapshot data.**  
   The Tags page renders service-provided vocabulary, validation, import-preview, and projection status state. UI actions are command hooks into the service; UI code does not write canonical files directly.

## Risks / Trade-offs

- **Projection backend differs from final SQLite target** → Keep the service facade and projection registry target name stable so SQLite can be introduced later without changing UI or tag-regulator call sites.
- **Two vocabulary sources during migration** → Prefer canonical export and keep prefs fallback deterministic; do not attempt bidirectional sync in this phase.
- **Legacy workflow still mutates prefs** → Treat prefs as compatibility state only. Canonical writes are the main path once the Tags page is used.
- **Import conflict UX can grow large** → Implement a minimal merge preview and explicit merge actions first, with detailed conflict editing deferred.

## Migration Plan

1. Create the canonical tag vocabulary service and default empty assets.
2. Add optional one-way seed from existing prefs vocabulary when canonical vocabulary is missing.
3. Wire Synthesis service and host API export for tag-regulator.
4. Add Workbench Tags snapshot/UI state.
5. Keep old prefs behavior available for fallback and rollback.

Rollback is straightforward: disable Synthesis export usage in tag-regulator and continue using the existing prefs-backed path. Canonical tag files remain inert data if not used.

## Open Questions

None for this implementation phase.
