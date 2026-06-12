# Debug Mode

## Overview

Debug mode controls whether debug-only plugin features are visible and
functional. It is defined in `src/modules/debugMode.ts`.

## API

```typescript
function isDebugModeEnabled(): boolean
```

Returns `true` if a test override is set, otherwise returns
`HARDCODED_DEBUG_MODE` (currently `true`).

```typescript
function setDebugModeOverrideForTests(enabled?: boolean): void
```

Sets a test override. Call without arguments (or with `undefined`) to clear the
override and revert to `HARDCODED_DEBUG_MODE`.

## Current State

`HARDCODED_DEBUG_MODE = true` — debug features are always enabled in the
current build. This is a development-phase default and is expected to be set to
`false` for production releases.

## Consumers

| Consumer | File | Effect when debug mode is OFF |
|----------|------|-------------------------------|
| Workflow Debug Probe | `workflowDebugProbe.ts` | Probe tool hidden from UI |
| Plugin Skill Registry | `pluginSkillRegistry.ts` | `debug_only: true` skills excluded from registry |
| Host Bridge Capability Registry | `hostBridgeCapabilityRegistry.ts` | Debug capabilities filtered from listings |
| Local Deploy Debug Store | `skillRunnerLocalDeployDebugStore.ts` | Debug store writes become no-ops |
| Selection Sample | `selectionSample.ts` | Sample/validate context menu entries hidden |
| Debug Console Button | `preferenceScript.ts` | Debug console button hidden from preferences UI |
