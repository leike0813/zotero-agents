# Change: Add SkillRunner Connection Audit Dashboard Tab

## Why

Recent SkillRunner sequence debugging exposed failures where direct `curl`
requests reached the backend immediately, but plugin-side Gecko `fetch` calls
timed out repeatedly. The current runtime logs and SQLite state show the
symptoms, but they do not reveal which SkillRunner connection lane, backend,
request, or stream owner is occupying the plugin-side connection budget.

## What Changes

- Add a debug-only Dashboard tab for SkillRunner connection audit.
- Extend the SkillRunner connection governor with a redacted lifecycle event
  ring buffer and aggregate snapshot data.
- Expose the same redacted snapshot through a debug Host Bridge capability.
- Keep the audit surface read-only: no abort, retry, cleanup, or mutation
  controls.
- Gate the whole data path behind debug mode. When debug mode is disabled, the
  tab is hidden and Dashboard snapshot construction does not read governor
  audit data.

## Impact

- `task-dashboard-skillrunner-observe`: Dashboard gains a debug-only
  connection audit surface.
- `task-runtime-ui`: runtime Dashboard tab selection rejects the audit tab
  outside debug mode.
- `host-bridge-debug-capabilities`: Host Bridge debug snapshots can include
  SkillRunner connection governor diagnostics.

## Non-Goals

- No changes to SkillRunner connection scheduling, lane priority, or active
  connection limits.
- No changes to reconciler cadence, sequence settlement, or backend protocol.
- No Preferences UI entry for this audit surface.
