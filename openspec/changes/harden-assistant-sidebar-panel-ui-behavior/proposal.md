# Change: Harden Assistant Sidebar Panel UI Behavior

## Why

The shared assistant sidebar panels have several interaction regressions: busy runs expose an enabled text box instead of a clear interrupt action, drawer clicks can close the whole drawer, ACP Skills task pages leak focus behavior across runs, and task ordering jumps as runs update. These issues make long ACP/SkillRunner workflows feel unstable even when the underlying run state is correct.

## What Changes

- Unify reply composer behavior across ACP Chat, ACP Skills, and SkillRunner panels.
- Add an ACP Skills “interrupt current turn” action for busy runs that does not cancel the whole run or disconnect the session.
- Preserve per-run ACP Skills composer state across snapshot refreshes.
- Add a visible sidebar close action to the Assistant workspace shell.
- Harden drawer overlay dismissal so only outside clicks close drawers.
- Add warning LEDs and toast notifications for tasks entering user-interaction states.
- Stabilize task ordering using creation order instead of update time.

## Capabilities

### New Capabilities

### Modified Capabilities

- `assistant-sidebar-ui`: shared assistant panel input, drawer, close, and task-list behavior changes.
- `acp-skillrunner-compatible-runner`: ACP Skills busy-run interruption and per-run panel behavior changes.
- `skillrunner-sidebar-host-runtime`: SkillRunner sidebar task drawer ordering and waiting-state feedback changes.

## Impact

- Frontend assets: shared assistant panel model/renderer/CSS and assistant workspace shell.
- Runtime modules: ACP skill run store/actions, assistant workspace sidebar host, SkillRunner sidebar model/host.
- Tests: ACP UI smoke/model tests, ACP skill runner store tests, SkillRunner sidebar model/host tests.
