## Why

Assistant Workspace transcript updates are the highest-frequency UI events during active prompts. A regression allowed ACP Skills transcript/log/event churn to rebuild managed chrome and details drawer DOM, including the Runner pane, which violates the core UX boundary that transcript rendering must be isolated from non-transcript surfaces.

This change hardens that boundary as a durable contract so future prompt streaming, transcript pagination, or runtime log work cannot reintroduce whole-panel rebuilds from transcript-only changes.

## What Changes

- Add an explicit Assistant Workspace invariant: transcript-only updates may repaint transcript content, but must not rebuild toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission drawer DOM.
- Document the invariant in project-level agent instructions so future Assistant Workspace work treats transcript/chrome decoupling as a hard rule.
- Split ACP Skills child panel render gating so transcript revision/page/log/event churn does not enter the whole-panel chrome render key.
- Add region-level signature guards for managed drawers, especially details/context drawers, so unchanged drawer content is not cleared and recreated.
- Extend managed-region signature guards to reply, permission, and workspace task drawer surfaces so every non-transcript Assistant Workspace region has an explicit rebuild boundary.
- Make ACP Chat and ACP Skills transcript loading renders request/session scoped and idempotent so repeated loading snapshots do not recreate spinner DOM.
- Canonicalize ACP Skills host snapshot signatures so non-selected prompting transcript summary churn cannot repost current selected loading snapshots.
- Add focused tests that lock DOM node identity for non-transcript managed regions across transcript-only ACP Skills snapshots.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `assistant-workspace-ui-refresh-governance`: add reverse transcript/chrome decoupling requirements for Assistant Workspace child panels.

## Impact

- Affected UI implementation: ACP Chat child panel, ACP Skills child panel, shared assistant panel renderer, Assistant Workspace host snapshot signature, project-level `AGENTS.md`.
- Affected tests: `test/core/97-acp-ui-smoke.test.ts`.
- No backend protocol, persistence, dependency, or public API changes.
