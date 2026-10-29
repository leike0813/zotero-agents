# Design

## Context

See proposal.md. ACP runtime options already share a folding module, but config groups and serializers discard metadata. Assistant Workspace publishes independent managed regions; model UI must preserve that isolation. Preact and plugin_meta already exist.

## Goals / Non-Goals

**Goals:** Preserve backend control values and provide one shared picker and favorite store without new dependencies or schema migrations.

**Non-Goals:** Automatic saved-profile migration or changes to transcript ownership and rendering.

## Decisions

- Keep providerId, providerLabel and modelIdentifier on selectable model options throughout normalization. Use the shared parser and catalog lookup rather than reconstructing identifiers from labels.
- Keep a per-runtime connection promise and publish checking-command before awaiting backend refresh. Project checking-command/spawning/initializing as connecting in owner controls.
- Store option IDs per backend in plugin_meta; validate favorite actions against the selected owner's current catalog. Subscribe once per workspace host and publish composer-only updates for relevant owners.
- Extend only the model option DTO with provider metadata and favorite state, preserving strict action and publication validation.
- Implement the model popup as a shared Preact portal. Search, collapse and scroll remain component state; mode and reasoning retain their existing controls.
- Add distinct v2 preset metadata while retaining the original v1 identifier and version-specific isolation configuration.

## Risks / Trade-offs

- Ambiguous identifiers → classify as other models unless provider evidence is available.
- Backend catalogs change → retain absent favorite IDs without displaying stale entries.
- Streaming updates → retain region signatures and verify component/transcript identity at existing UI seams.
- Cyclic shell initialization → keep shell registration slots in a leaf module and resolve surface adapters at dispatch time.

## Migration Plan

No database or saved-profile migration. New favorites use an independent plugin metadata key. Existing backend profiles continue to run their saved commands.
