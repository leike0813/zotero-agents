## Context

Topic synthesis currently appears coupled to the former Index / Paper Registry Cache in several governance documents because topic freshness is described as a background state driven by saved paper refs, artifact hashes, graph hashes, and registry cache rebuild impact rules. That model made sense while Synthesis was being consolidated into a DB-first runtime, but it creates more coupling than the common user workflow needs.

The current topic skills already use a different operational boundary:

- create reads existing topics, a lightweight library index, resolver results, filtered paper artifacts, and optional citation graph metrics through `zotero-bridge synthesis ...`;
- update reads current topic context, then either reuses or recomputes resolver/workset through the same Host Bridge facade;
- citation graph metrics are explicitly documented as auxiliary ranking/diagnostic signals and cannot replace digest evidence.

This means Topics can be modeled as explicit workflow artifacts built from Zotero library/artifact facade inputs, while Paper Registry Cache and Citation Graph remain focused on registry, reference resolution, graph structure, metrics, and graph UI.

## Goals / Non-Goals

**Goals:**

- Make the Host Library / Artifact Facade the canonical primary input boundary for topic create/update.
- Define Paper Registry Cache as a registry/graph maintenance domain, not a normal driver of topic artifact lifecycle.
- Define Citation Graph metrics as optional enrichment for topic synthesis.
- Replace continuous/background topic freshness as a target contract with explicit source-check diagnostics.
- Keep discovery as an optional hint cache, separate from topic artifact lifecycle and registry cache rebuild.
- Update human-readable governance documents, diagrams, engineering contracts, and YAML guardrails.

**Non-Goals:**

- No runtime code changes in this documentation change.
- No migration of existing topic rows, topic artifacts, discovery hints, or dirty events.
- No change to built-in topic skill payload schemas.
- No change to `literature-digest` metadata generation or persistence contracts.
- No embedding, semantic search provider, or LLM pairwise judge for discovery.

## Decisions

### Topic workflows read the Host Library / Artifact Facade

Topic create/update SHALL be documented as reading a Host Bridge facade over Zotero items and artifact notes. This facade can be implemented by current Synthesis service methods, but the architectural contract is not “Topics read committed registry cache state.”

Rationale: current `get-library-index`, `resolve-resolver`, and `export-filtered-paper-artifacts` paths are already library/artifact facade operations. Treating them as registry cache dependencies obscures the real boundary and makes registry cache rebuild look like a topic prerequisite.

Alternative considered: make topic workflows consume only Synthesis registry cache DB rows. This would centralize reads but would also make registry cache rebuild a prerequisite for topic synthesis and preserve the coupling this change is trying to remove.

### Registry cache events do not drive Topics

Incremental registry cache events, startup reconcile, and registry/graph cache rebuild SHALL not enqueue topic source-check or discovery work in the target contract. Topic artifacts change only through explicit topic workflow apply, delete, import, or user review/update actions.

Rationale: digest artifacts are typically stable after creation. Maintaining background freshness for rare digest delete/rerun cases adds queue fan-out, stale state, and UI noise.

Alternative considered: keep background topic freshness workers but narrow their scope. This is safer short-term but preserves cross-domain event coupling and leaves users with ambiguous stale/dirty signals.

### Freshness becomes explicit source check

The target UI concept is “source check” rather than always-current freshness. A topic may display when it was generated, what source manifest it used, and the result of the last explicit source check. Running a source check can compare saved topic source refs against current Host Library / Artifact Facade output, but the check result is diagnostic until the user chooses to update the topic.

Rationale: a topic artifact is closer to a generated research report than a continuously synchronized dashboard. Users need explicit update affordances, not constant background invalidation.

Alternative considered: remove freshness entirely. That is simpler, but users still benefit from an explicit “check sources” diagnostic before deciding whether to update a topic.

### Citation Graph metrics remain optional enrichment

Topic synthesis MAY read Citation Graph metrics for ranking, role hints, coverage caveats, and external-heavy diagnostics. Metrics MUST NOT be required for topic synthesis, and missing/stale metrics MUST NOT block topic create/update.

Rationale: this preserves useful graph context without letting Graph maintenance become a topic workflow precondition.

### Discovery remains a separate hint cache

Discovery hints remain optional, best-effort, and separate from topic artifact lifecycle. Digest apply-time matching or explicit repair can update hints, but accepting a hint should route into explicit topic update flow.

Rationale: this keeps discovery useful without making it a background synchronization bridge between registry cache and Topics.

## Risks / Trade-offs

- **Risk: Topics can become outdated without a background stale marker.** → Mitigation: expose explicit source-check action and last-check diagnostics.
- **Risk: Users may expect automatic topic updates.** → Mitigation: UI copy should describe topics as generated artifacts and updates as explicit workflow runs.
- **Risk: Existing implementation still has transitional freshness workers and DB/file helpers.** → Mitigation: documents must label this as current drift and provide follow-up tasks for implementation cleanup.
- **Risk: Host Bridge facade is currently implemented inside Synthesis service methods.** → Mitigation: document the conceptual boundary separately from current module placement.
- **Risk: Removing registry-cache-driven topic work could hide rare digest corruption or deletion.** → Mitigation: explicit source check, debug diagnostics, and update workflow can still surface those cases on demand.

## Migration Plan

This change is documentation-only. Future implementation changes can migrate in phases:

1. Stop enqueuing topic freshness/discovery from registry cache dirty events and registry/graph cache rebuild.
2. Rename or reframe UI freshness surfaces as source-check diagnostics.
3. Preserve existing topic artifact/source manifest data as explicit workflow baseline.
4. Keep legacy freshness rows readable during transition, but do not treat them as background invariants.
5. Remove transitional coupling once Workbench UI and debug tools expose source-check behavior.

## Open Questions

- Should the explicit source check be implemented as a standalone Host Bridge capability, a Workbench command, or both?
- Should source check re-resolve dynamic resolvers by default, or only compare saved explicit paper refs and artifact availability?
- How much of the existing `freshness` terminology should be retained for backward-compatible DB/API fields during transition?
