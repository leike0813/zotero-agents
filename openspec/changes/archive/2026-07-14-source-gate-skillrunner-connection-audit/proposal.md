## Why

SkillRunner connection audit is currently hidden behind debug-mode UI and capability gates, but its governor hot path still records, retains, and summarizes audit events in every build. The feature needs the same source-level gate and production elision contract as ACP Trace and Replay so disabled builds carry no audit-path runtime cost.

## What Changes

- Add an independent, hard-coded SkillRunner connection-audit source switch that defaults to disabled and composes with debug mode.
- Require both gates before the Dashboard audit surface or Host Bridge snapshot capability is visible or callable.
- Isolate audit storage and snapshot projection from the connection governor so source-disabled and non-debug bundles eliminate audit state, event construction, retention, and summary work.
- Extend runtime-diagnostics build checks to prove module and hot-path elision while preserving the enabled audit DTO and behavior.
- Correct debug, Dashboard, and SkillRunner documentation that currently describes audit collection as opt-in even though only audit reads are gated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-dashboard-skillrunner-observe`: Gate the SkillRunner connection-audit surface and its collection path by the source switch and debug mode.
- `task-runtime-ui`: Require disabled connection-audit builds to leave SkillRunner scheduling behavior unchanged without retaining audit runtime work.
- `host-bridge-debug-capabilities`: Expose the connection-audit snapshot capability only when the source switch and debug mode are both enabled.

## Impact

The change affects debug-mode build constants, SkillRunner connection-governor diagnostics, Dashboard tab normalization and snapshot loading, Host Bridge debug capability registration, runtime-diagnostics esbuild/elision checks, focused tests, and component documentation. It does not change connection scheduling, audit event semantics, the snapshot wire shape, dependencies, or production user-facing behavior.
