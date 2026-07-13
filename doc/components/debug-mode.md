# Debug Mode

## Overview

Debug mode controls debug-only plugin capabilities and instrumentation. Its
single runtime API is defined in `src/modules/debugMode.ts`; the build-time
constant `__debug_mode__` is injected by `zotero-plugin.config.ts` and is true
only for builds produced from the `dev` branch.

## API

```typescript
function isDebugModeEnabled(): boolean
```

Returns the test override when one is set, otherwise the build-time debug
constant.

```typescript
function setDebugModeOverrideForTests(enabled?: boolean): void
```

Sets the test-only override. Calling it without an argument clears the
override. The override is mirrored to a test-only global so modules whose
production calls are compile-time guarded can be exercised under Node and the
Zotero mock.

## ACP Runtime Performance Profiler

`src/modules/acpRuntimePerformanceProfiler.ts` is available only in debug
builds and still requires an explicit call to
`enableAcpRuntimePerformanceProfiler()`. A debug build that does not enable it
does not allocate profile state or start the event-loop drift timer.

Production hot-path call sites use the injected `__debug_mode__` constant.
The build marks the profiler module as side-effect free and enables syntax
folding, so non-debug bundles eliminate both the guarded calls and the module.
`npm run check:acp-profiler-release-elision` is the release gate for this
property.

The profiler has no preference or user-visible control. Tests enable it through
the debug override; `ZOTERO_TEST_PERF_PROBE=1` enables it automatically only
when the performance test harness is running in debug mode.

## Consumers

| Consumer | File | Effect when debug mode is OFF |
|----------|------|-------------------------------|
| ACP Runtime Performance Profiler | `acpRuntimePerformanceProfiler.ts` | Recorder calls and profiler module are removed from release bundles |
| Workflow Debug Probe | `workflowDebugProbe.ts` | Probe tool hidden from UI |
| Plugin Skill Registry | `pluginSkillRegistry.ts` | `debug_only: true` skills excluded from registry |
| Host Bridge Capability Registry | `hostBridgeCapabilityRegistry.ts` | Debug capabilities filtered from listings |
| Local Deploy Debug Store | `skillRunnerLocalDeployDebugStore.ts` | Debug store writes become no-ops |
| Selection Sample | `selectionSample.ts` | Sample/validate context menu entries hidden |
| Debug Console Button | `preferenceScript.ts` | Debug console button hidden from preferences UI |
