# Design

## Context

See proposal.md for motivation. Real runs use correct plural paper refs but return no Topic candidates because lookup prefilters empty resolved sets. Existing discovery projections already retain canonical source refs. Citation reads are one hop, layout computes only the overview projection, and standalone rendering applies that overview policy again. Deep-reading reads must remain read-only and basis-bound.

## Goals / Non-Goals

**Goals:** restore associated timelines, bounded two-hop embedding, shared coordinates for external references, and current-paper focus.

**Non-Goals:** change Workbench overview visibility, introduce an embedding layout engine, migrate canonical artifacts, publish releases, or modify the user's original library.

## Decisions

- Topic lookup uses the union of resolved membership and existing discovery source refs in both repository candidate selection and application match reporting. Preserve bounded indexed lookup, canonical validation, deduplication, and accurate match-source labels; do not reinterpret source refs as resolver membership.
- Add depth to the application neighborhood request, default one, bounded 1..4. Repository performs deterministic breadth-first bounded reads in the existing guarded transaction. Slice and layout pass the same direction/filter/caps; deep reading normalizes graph depth to two. No full-graph load in a read adapter.
- Shared layout admits active library, shared external, then single external nodes in stable ID order under the existing 20,000/80,000 caps. Use an explicit layout projection rather than widening the overview projection. Bump layout version and include that identity in readiness so old coverage remains stale.
- Standalone export carries optional `projectionMode: overview | neighborhood`, default overview. Shared visual rules own the distinction; deep-reading export and SVG fallback choose neighborhood. Filters still remove nodes/edges but never demote a neighborhood external node for its local source count. Repeated normalization and interaction preserve the mode.
- Resolve focus from the target portable paper ref against snapshot node IDs/aliases, retaining actual IDs throughout rendering. Host coordinates remain the sole coordinate source.

## Risks / Trade-offs

- More layout nodes increase compute cost and may move existing nodes; retain current worker budgets, hard bounds, cancellation, and atomic promotion.
- Old persisted layouts are partial until explicit maintenance regenerates them; reads retain stale state and usable coordinate intersections.
- Isolated acceptance may expose unrelated invalid legacy Topic DTOs; report those independently rather than relaxing trust-boundary validation.

## Migration Plan

No schema migration. Verify current-source Rust and generated Skill in isolation, recompute shared layout through existing maintenance/application entry points on a consistent copy, and regenerate HTML from copied run data. Preserve original attachments. Packaged delivery requires existing build preflight and governed runtime/content workflows; do not publish or commit as part of this change.
