## Context

The previous Synthesis architecture used “Index / Literature Registry” as a broad bridge between Zotero Library, artifact notes, Topics, Citation Graph, cleanup, and maintenance. That framing was useful while the DB-first persistence foundation was being built, but it now overstates the role of Index.

Recent contracts already changed the surrounding boundaries:

- Topic create/update reads Host Library / Artifact Facade inputs as its primary source.
- Citation Graph metrics are optional enrichment for topic workflows.
- Topic source checks are explicit diagnostics, not background freshness invariants.
- Startup reconcile is a bounded detector for Zotero external source drift, not an unbounded impact executor.

Given those constraints, the former Index domain can be simplified into a narrower rebuildable cache: it materializes the parts of Zotero-bound literature and reference facts needed by Registry UI, cleanup/review, reference resolution, Citation Graph, debug, and maintenance. It should not be the central fact layer for every Synthesis feature.

## Goals / Non-Goals

**Goals:**

- Replace the target architecture wording “Index is the Synthesis foundation” with “Paper Registry Cache is a rebuildable operational cache.”
- Define what the cache owns: literature binding cache, artifact readiness, reference instances/resolutions, cleanup proposals/reviews, graph inputs, and maintenance summaries.
- Define what the cache does not own: Topic artifacts/source checks/discovery, Tag vocabulary, Concept KB, Topic Graph, or workflow artifact content.
- Reframe full rebuild and startup reconcile as registry/graph cache maintenance operations with bounded fan-out.
- Keep current runtime names tolerable during migration where renaming every command or table would add churn without changing behavior.

**Non-Goals:**

- No runtime code changes in this documentation change.
- No schema migration, data migration, or deletion of existing DB tables.
- No `literature-digest` submodule change.
- No removal of Registry UI, cleanup review, reference resolution, or Citation Graph.
- No rename of every existing `index.*` event or command ID in one step; documentation may mark those names as historical/current implementation names.

## Decisions

### Paper Registry Cache replaces Index as the architectural role

The target domain name is **Paper Registry Cache**. It may still be implemented by modules and APIs with existing names such as Index, Literature Registry, or Paper Registry during transition, but governance documents should describe the semantic role as a cache.

Rationale: users and future developers need the mental model to match the simplified dependency graph. The cache is useful and worth keeping, but it is not the root of Topics, Tags, Concepts, or workflow artifacts.

Alternative considered: keep “Index” as the official name but add caveats. That preserves current labels, but it keeps inviting full-system coupling and makes rebuild behavior feel more powerful than it should be.

### The cache is rebuildable and scoped

The cache SHALL be rebuildable from Zotero Library, artifact notes, user cleanup/review choices that remain valid, and reference-resolution facts. Rebuilds update Registry UI, cleanup, reference-resolution, and Citation Graph state. They do not mutate topic artifacts, tag vocabulary, concept facts, or topic graph facts.

Rationale: this keeps rebuild safe and predictable. If rebuild does not own those domains, it cannot accidentally change them.

Alternative considered: make the cache the canonical literature identity layer for all Synthesis domains. That would simplify lookup in one place but reintroduce cross-domain rebuild blast radius.

### Full Index rebuild becomes full registry/graph cache rebuild

The target user-facing and documentation term is “registry/graph cache rebuild.” Current implementation names such as `full Index rebuild` can be documented as transitional labels, but target contracts should define the operation by its bounded effect: rebuild paper registry cache and derived citation graph state.

Rationale: the operation is expensive and needs approval/progress, but it should not imply full Synthesis recomputation.

Alternative considered: keep “full Index rebuild” as the target term. That name is concise, but it preserves the old foundation mental model.

### Registry cache events do not fan out into independent domains

Registry cache dirty events, startup reconcile, and registry/graph rebuilds may enqueue bounded registry and graph work. They MUST NOT enqueue normal topic source-check, topic discovery, tag, concept, or topic graph work. Those domains use explicit user/workflow actions or their own domain events.

Rationale: this is the main simplification payoff. It narrows background jobs to the registry/graph subsystem and makes UI behavior easier to reason about.

Alternative considered: keep a central impact planner that computes cross-domain work from every library change. That is more complete for rare edge cases, but too coupled for a single-user Zotero plugin where digest artifacts are usually stable after creation. The retained target is only a thin event routing / invalidation policy for registry/graph-scoped work.

## Risks / Trade-offs

- **Risk: Some rare source drift no longer updates Topic diagnostics automatically.** → Mitigation: explicit source check and update-topic flows still compare current Host Library / Artifact Facade inputs when the user asks.
- **Risk: Existing code and UI names still say Index.** → Mitigation: treat those names as transitional implementation labels; future implementation changes can rename UI/commands gradually.
- **Risk: Rebuild may feel less comprehensive to users who expect “full” to mean all Synthesis domains.** → Mitigation: rebuild confirmation and progress copy should state it rebuilds registry/graph cache only.
- **Risk: Cache simplification can hide truly corrupted registry rows until rebuild/debug.** → Mitigation: keep debug snapshot, startup drift incidents, and registry/cache integrity checks scoped to this domain.
