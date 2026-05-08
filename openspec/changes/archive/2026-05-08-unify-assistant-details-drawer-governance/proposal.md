# Unify Assistant Details Drawer Governance

## Why

The managed Assistant UI now renders ACP Chat, ACP Skills, and SkillRunner through a shared panel runtime, but the Details drawers still behave like a thin dump surface. After recent shared CSS cleanup, Details drawers can lose scrollability, heavy diagnostic sections are always expanded, and SkillRunner Details exposes full conversation state that is not useful for normal inspection.

This change defines Details as a governed metadata and diagnostics drawer:

- The drawer must be scrollable and visually structured.
- Heavy diagnostics must be collapsible by default.
- Diagnostic/export actions belong inside Details.
- Backend management belongs in the outer toolbar, not inside Details.
- SkillRunner Details must show current run metadata, not full conversation history.

## What Changes

- Extend the managed Details model with section summary, kind, tone, and collapse metadata.
- Update the shared renderer to render Details sections as card-like, optionally collapsible sections.
- Fix shared Details drawer CSS so the header is fixed and the details body is the primary scroll region.
- Remove ACP Chat backend-management action from Details while keeping it in the outer toolbar.
- Expose backend management from the ACP Chat, ACP Skills, and SkillRunner toolbars.
- Reduce SkillRunner Details content to metadata and compact diagnostics summaries.

## Capabilities

### Modified Capabilities

- `assistant-sidebar-ui`: unified Details drawer layout, action placement, scroll behavior, and collapsible diagnostics sections.
- `skillrunner-sidebar-host-runtime`: SkillRunner Details visible content boundary.

## Impact

- Affects `AssistantPanelSnapshot` details projection and shared renderer/CSS only.
- Does not change transcript, reply zone, Runs drawer, MCP tools, stores, or backend protocols.
- Does not remove full diagnostics; complete diagnostic payloads remain available through existing copy/export actions.
