## Why

The shared ACP Workspace architecture removed source-specific snapshots, but
its semantic surface still omits or changes user-visible ACP Chat and ACP Skills
controls that existed on `dev@e5cda701`. The internal publication contract also
drifted through repository-local revisions even though the first post-`dev`
contract was v1 and no external compatibility boundary exists.

## What Changes

- **BREAKING** Replace the superseded internal publications with the sole strict
  `zotero-agents.assistant-workspace-publication.v1` current-state contract;
  reject non-v1 input and do not provide aliases, compatibility reads, or dual
  writes.
- Restore the complete `dev@e5cda701` ACP Chat and ACP Skills visible UI
  contract through the shared region-based surface, including toolbar modes,
  banner controls, transcript presentation, plan, hint, permission review,
  composer, owner navigation, and details.
- Add a lazy, owner-guarded `owner-details` region whose bounded DTOs do not
  materialize transcript history or full session/run snapshots.
- Use structured permission approval and review DTOs, with owner identity only
  in the canonical publication/action envelope.
- Publish Skills plans independently and preserve region-level DOM identity,
  owner-first loading, page-first transcript rendering, and cold-mirror cache
  constraints.
- Localize all restored visible labels and record the authoritative UI contract
  in a dated audit artifact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-workspace-publication-data-plane`: Define the sole strict v1
  publication, exact region/action registries, structured permission DTO, and
  lazy owner-details region.
- `assistant-workspace-ui-refresh-governance`: Require stable per-region
  signatures and DOM identity for every shared managed region while restoring
  the full ACP UI contract.
- `assistant-sidebar-ui`: Restore the complete Chat/Skills shell, banner,
  navigation, permission, details, and composer interaction semantics.
- `acp-chat-performance-ui`: Preserve owner-first/page-first and bounded
  incremental rendering while restoring Chat controls and details.
- `acp-skill-run-file-backed-runtime-state`: Publish Skills plan, task state,
  permission, composer, and details from run/task SSOT without full snapshots.
- `plugin-localization-governance`: Require every restored ACP-visible label to
  come from `AssistantPanelLabels` across all supported locales.

## Impact

The change affects Assistant Workspace publication types/runtime/coordinator,
ACP Chat and ACP Skills adapters and read models, the shared browser
model/renderer/child/CSS, Sidebar Host action routing, labels and eleven locale
files, replay fixtures, conformance/UI tests, and current-state OpenSpec/docs.
It does not change transcript persistence, run/conversation store formats, MCP
services, external APIs, user configuration, or the isolated SkillRunner panel.
