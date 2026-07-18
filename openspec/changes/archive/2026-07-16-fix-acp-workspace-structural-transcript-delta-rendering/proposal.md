## Why

Round3 reduced ACP Chat publication bytes from roughly 5.41 MB to 369 KB, but the accepted boundary replay still spends 232–254 seconds in target-active because every structural transcript delta falls back to whole-window reconciliation and layout measurement. The shared child mirror also lets a stable tail page grow past its declared limit, and Chat/Skills translate the same item into different publication and render identities, so the current implementation does not satisfy the archived incremental-publication contract.

## What Changes

- Make `itemId` the only transcript item identity and represent presentation rows explicitly with `rowKey + itemIds`; remove the browser-side `id/kind/state` aliases and tool pseudo-item identities.
- Keep the selected tail page bounded by `limit`, advance its cursor from `totalItemCount`, and apply delta batches transactionally without copying or reprojecting the complete page.
- Implement keyed structural insert, delete, patch, grouping, dirty-row measurement, and scroll-geometry updates in the shared Chat/Skills renderer; steady delta failure requests rebase instead of falling back to a full render.
- Move both children onto one shared transcript publication view/controller and make message-count publications render directly from their typed DTO.
- Correct replay display-mode provenance and profile-window publication ownership, and add render-work observations that prove steady deltas do not perform full renders.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-workspace-publication-data-plane`: Define unique item versus presentation-row identity, bounded tail-page delta semantics, atomic structural effects, and the prohibition on steady full-render fallback.
- `assistant-workspace-ui-refresh-governance`: Require dirty-row-only transcript work and direct typed message-counter rendering for both children.
- `acp-chat-performance-ui`: Require Chat boundary structural deltas and count updates to avoid page/panel materialization and cumulative render work.
- `acp-runtime-performance-profiler`: Record actual display mode and bounded child render work without contaminating the publication ACK contract.
- `acp-runtime-replay-profiler`: Scope R3 completeness to publication identities posted inside the active profile window.

## Impact

The change affects the shared transcript publication receiver, virtualized renderer and panel counter renderer; the ACP Chat and ACP Skills child adapters; tail metadata in the existing publication coordinator; Assistant Workspace scheduling; and profiler/replay aggregation. Publication v3, Chat/Skills stores, JSONL/index formats, persistence, external APIs, user display-mode preferences, and dependencies remain unchanged.
