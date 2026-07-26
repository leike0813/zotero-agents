## Why

The SkillRunner panel can remain pinned to plugin-generated pre-request notices even after backend history has reached the selected run. A critical refresh currently publishes lifecycle chrome without advancing the live transcript mirror, so the unchanged transcript revision causes the receiver to correctly skip the backend content.

## What Changes

- Make SkillRunner transcript publication mode-aware and additive so a critical refresh cannot suppress changed transcript content in live mode.
- Classify semantic boundaries in HTTP history catch-up with the same boundary rule used for live SSE events.
- Preserve boundary and silent display-mode suppression while releasing accumulated content at the correct semantic boundary.
- Add sequential production-snapshot coverage for local-only to backend-history transitions and retain non-transcript managed-region DOM identity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-workspace-ui-refresh-governance`: Clarify that immediate critical publication and transcript eligibility are additive, and that live-mode transcript changes cannot be lost when refresh reasons coalesce.
- `skillrunner-sidebar-host-runtime`: Require selected SkillRunner owners to publish backend history with a new transcript revision after a local-only initial snapshot while preserving execution display policy.

## Impact

The change is limited to the legacy SkillRunner run-dialog snapshot producer, its production snapshot test harness, shared managed-panel regression tests, and the Assistant sidebar UI SSOT. The SkillRunner wire schema, backend protocol, history persistence, receiver revision guard, and ACP Chat/Skills runtimes remain unchanged. No dependency changes are required.
