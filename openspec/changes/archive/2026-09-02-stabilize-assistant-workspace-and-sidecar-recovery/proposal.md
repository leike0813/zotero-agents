## Why

Opening Assistant Workspace and switching to SkillRunner can make the refresh
notification and explicit activation publish the same baseline twice. The same
path persists protocol/render success chatter at a rate far above the value of
the diagnostics. Separately, an abnormal sidecar exit can leave discovery
behind, while Windows release builds currently provide no durable matching PDB
for post-crash analysis.

## What Changes

- Make shared workspace initialization generation- and owner-scoped, reusable,
  and stale-publication safe.
- Persist only workspace ready lifecycle events and failures; keep performance
  observations in their existing bounded profiler path.
- Remove stale sidecar discovery only after winning the production lock and
  verify parent-input shutdown with a real process.
- Produce deterministic compressed Windows symbols and publish them beside,
  but outside, the immutable seven-runtime set.
- Require matching Windows symbols before a prebuild cache candidate is reused.

## Capabilities

### Modified Capabilities

- `assistant-workspace-ui-refresh-governance`
- `skillrunner-workspace-surface`
- `runtime-log-pipeline`
- `log-retention-control`
- `synthesis-sidecar-runtime-supervision`
- `synthesis-sidecar-prebuild-release`

## Impact

The runtime bundle schema, seven-platform aggregate, XPI contents, ACK protocol,
transcript store, and graphics preferences do not change. Existing runtime logs
are not deleted. Native source/build-recipe changes make the checked-in prebuild
set stale until a separately authorized remote prebuild is run.
