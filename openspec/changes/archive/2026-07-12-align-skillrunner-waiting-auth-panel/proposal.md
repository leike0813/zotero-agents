## Why

The SkillRunner panel stops every observation path after a run enters `waiting_auth`, so browser or device authorization can complete in the backend while the panel remains frozen in the waiting state. The panel also diverges from the backend e2e client in input visibility, authorization URL/code projection, and authentication-method submission semantics.

## What Changes

- Restore a request-scoped `waiting_auth` watchdog that observes canonical run state plus pending/auth read models without taking settlement ownership.
- Hand a run to the existing foreground continuation exactly once after canonical state leaves `waiting_auth`; do not restore legacy global session-sync ownership.
- Keep the auth composer mounted for every `waiting_auth` state, disabling its input and submit button when the challenge does not accept chat input.
- Normalize authentication-method options and submit the canonical `selection.kind/value` payload without requiring an auth session id.
- Match the e2e client's auth controls for external links, hints, text challenge labels, method actions, and auth-file import, excluding the custom-provider configuration form.
- Preserve shared Assistant Workspace region identity during auth-only refreshes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-dashboard-skillrunner-observe`: Define panel-owned `waiting_auth` observation, canonical foreground handoff, and core auth interaction projection/submission behavior.

## Impact

- SkillRunner run observation and action dispatch in `src/modules/skillRunnerRunDialog.ts`.
- Shared Assistant Workspace panel model/renderer/styles and the SkillRunner run-dialog bridge.
- Existing localization surfaces for auth import validation and progress.
- Focused SkillRunner observer, panel-model, and DOM-identity tests.
- No backend API, dependency, persisted state, or reference Skill-Runner changes.
