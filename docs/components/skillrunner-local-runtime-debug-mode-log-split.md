# SkillRunner Local Runtime Debug Mode + Log Split

## Purpose

Define a stable SSOT for local-runtime logging channels and debug-only surface gating:

- Persistent runtime logs: key milestones only.
- Debug console logs: diagnostic stream only when debug mode is on.

## Debug Mode SSOT

- Source: `src/modules/debugMode.ts`
- Default: disabled (`false`)
- Test seam: `setDebugModeOverrideForTests(enabled?)`

This mode controls:

- Local deploy debug store write behavior.
- Preferences debug console button visibility.
- Selection sample/validate context-menu registration.
- Pref event guard for opening debug console.

## Logging Split Rules

### Persistent runtime log channel

Allowed key operations:

- `deploy-*`
- `oneclick-preflight`
- `lease-acquire`
- `uninstall-*`

Excluded monitoring/polling categories:

- `lease-heartbeat`
- `heartbeat-fail-reconcile`
- `auto-ensure-*`
- `ensure-*`

### Debug console channel

- Uses `skillRunnerLocalDeployDebugStore`.
- Writes are no-op when debug mode is disabled.
- Remains independent from persistent runtime log retention/filters.

## Invariants

- Debug mode off SHALL hide debug-only user surfaces.
- Debug mode off SHALL not collect local deploy debug entries.
- Persistent logs SHALL never receive periodic monitoring/polling noise.
- Persistent logs SHALL still capture key deploy/uninstall lifecycle milestones regardless of debug mode.
