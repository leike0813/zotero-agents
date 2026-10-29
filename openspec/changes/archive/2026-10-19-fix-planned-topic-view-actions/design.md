# Design

## Context

See proposal.md for motivation. Native Topics input already contains separate artifact rows and bounded Topic Graph nodes, including planning metadata. The host strips planning metadata, and the page renders list/grid exclusively from artifact rows. The option adapter converts every filter except updatable to all. Existing workflow execution supports gated initial workflow parameters.

## Goals / Non-Goals

Keep artifact inventories, native contracts, storage and read bounds unchanged. Build a Topics-only presentation from both inputs, with one set of action rules and stable topic identities. No new dependencies or publication.

## Decisions

- Preserve only planning lifecycle/revision and display timestamps through the portable host DTO. Do not send arbitrary resolver or provenance data into component signatures.
- Merge materialized rows and nondeleted planned/stale nodes in the page Topics projection. Materialized rows win by ID. Keep artifact snapshot collections unchanged so Home, readers and review consumers retain their existing meaning.
- Extract the existing structural filter/sort into one shared pure helper. Reuse it for artifact rows and mixed Topics presentation rows; do not import privileged host code into the page.
- Keep lifecycle separate from artifact freshness. Planned rows expose no synthesis paper count, readiness or discovery result. Stable IDs remain the virtualization keys.
- Reuse runSynthesizeTopic with optional plannedTopicId, scoped pending keys and existing gated workflow execution. Validate planned/updatable targets through listWorkflowOptions before opening; pass initial workflowParams without storing form defaults. Runtime planning CAS remains authoritative after the dialog opens.
- Keep materialized Open/Update/Delete in list, Open/Update in graph inspector, and one workflow icon in grid. Planned/stale entries expose Create/enabled or Create/disabled. Grid uses sibling controls rather than nested buttons.

## Risks / Trade-offs

- Bounded surface inputs retain their current pagination limits; this change does not claim complete inventory beyond those bounds.
- Lifecycle can change after display: current option validation and existing runtime re-read reject obsolete targets without identity fallback.
- Graph updates can affect list memoization: project only visible row facts and action availability into Topics selections, excluding graph selection, layout, provenance and revision when not displayed.

## Migration Plan

No data migration. Rebuild the plugin through preflight and verify the existing isolated Zotero submission-window runner. Reverting the source change restores prior presentation without touching stored plans.
