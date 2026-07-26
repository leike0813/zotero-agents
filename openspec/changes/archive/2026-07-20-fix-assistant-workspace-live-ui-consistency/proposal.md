## Why

Assistant Workspace currently loses several live UI state transitions: sustained transcript tail-follow can override an explicit user scroll-away, ACP Chat terminal messages can remain in streaming plain-text presentation, and conversation controls can display stale or empty state until the owner is switched. These failures violate the existing region-scoped rendering and transcript convergence contracts and make active ACP conversations difficult to control.

## What Changes

- Respect upward user scrolling while transcript tail-follow work is pending on both ACP Chat and ACP Skills.
- Preserve terminal transcript boundary semantics when ACP Chat flushes concurrent live region changes so completed messages render Markdown immediately.
- Publish the ACP Chat owner-control region when conversation permission auto-approval changes.
- Keep connected ACP Chat runtime option values visible in every lifecycle state; keep mode editable while prompting or interruption is requested, while model and reasoning remain frozen.
- Consolidate the duplicated ACP Chat/ACP Skills runtime-option group projection and document the current-state UI contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-sidebar-ui`: Require immediate banner convergence after auto-approval changes and define connected ACP Chat runtime-option visibility and editability.
- `acp-chat-performance-ui`: Route multi-region changes additively and allow mode changes while interruption is requested without rebuilding unrelated regions.

## Impact

- Affects the shared transcript renderer, ACP Chat workspace change classification and projection, and the shared ACP runtime-option projector.
- Extends existing session-manager and UI smoke tests for live publication timing, scroll intent, regional DOM identity, and runtime controls.
- Does not change public actions, wire schemas, persisted transcript format, provider APIs, or dependencies.
