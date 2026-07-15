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

`src/modules/debugMode.ts` owns independent literal switches for the bounded
performance profiler, semantic Trace Recorder, and Replay Profiler. Trace
capture never enables profiling; replay activates profiling only inside its
fixed profile windows. The Recorder and Replay modes are mutually exclusive.
Replay matrix v2 exposes execution and measurement completion independently;
missing R1/R2/R3 evidence cannot be mistaken for a successful comparable
baseline, even when all nine replay executions finish.

Replay supports recorded, logical, and burst cadence. Logical time is created
only inside an active replay run and takes ownership only of explicitly scoped
synthetic timers. It never patches global timers. Non-debug and Replay-source
disabled bundles remove the logical scheduler and timer control bodies. When
Replay is present but logical cadence is idle, normal Chat, Skills, and
Workspace timer hot paths execute the same direct native calls as before.

Production hot-path call sites use the injected `__debug_mode__` constant.
`scripts/runtime-diagnostics-production-manifest.ts` is the build SSOT for
debug-exclusive modules, side-effect classification, forbidden executable
markers, and the narrow static Dashboard/locale/type allowance. Both esbuild
and `npm run check:runtime-diagnostics-release-elision` consume this manifest.
The check compiles the real plugin entry and requires every exclusive input to
contribute zero release bytes, rather than inferring isolation from source
switch output equality. It also verifies independently disabled source modules
and keeps source equality only as an auxiliary assertion.

Trace gates enclose owner/context construction, update access, and recorder
calls together. Replay publication acknowledgement lives in a debug-exclusive
sidecar; ordinary Workspace host state, snapshots, child actions, and the three
child render queues contain no Replay drain protocol. Replay-only Skills
exports remain tree-shakeable because production dynamic imports target narrow
facades instead of the full store namespace.

The switches are not preferences. Debug builds expose one **ACP Trace & Replay**
Dashboard tab with independently gated Recorder and Replay steps. Raw traces
have no copy, upload, submit, or automatic deletion action. Cancel preserves an
incomplete partial and releases the mode so another round can start without a
host restart. Tests enable the capabilities through the debug override;
`ZOTERO_TEST_PERF_PROBE=1` enables it automatically only when the performance
test harness is running in debug mode. See
`doc/components/acp-runtime-performance-profiler.md` for the automated and
Zotero-host procedures.

## SkillRunner Connection Audit

`SKILLRUNNER_CONNECTION_AUDIT_ENABLED` is an independent source literal in
`debugMode.ts` and defaults to `false`. The Dashboard surface, Host Bridge
capability, and governor collection path require both this source switch and
debug mode. The switch is not a preference and cannot be enabled at runtime.

Audit storage and snapshot projection live outside the connection governor.
Governor event points guard before constructing audit inputs, and diagnostic
readers use dynamic imports. The shared runtime-diagnostics production
isolation gate verifies that non-debug and audit-source-disabled bundles retain
zero audit module bytes or event markers. When both gates are enabled, the
existing bounded event ledger, 22 guarded event points, and read-only snapshot
contract are preserved.

## Consumers

| Consumer | File | Effect when debug mode is OFF |
|----------|------|-------------------------------|
| ACP Trace Recorder / Replay Profiler | `acpRuntimeSemanticTraceRecorder.ts`, `acpRuntimeReplayProfiler.ts` | Capture and replay modules are removed from release bundles |
| SkillRunner Connection Audit | `skillRunnerConnectionAudit.ts`, `skillRunnerConnectionAuditStore.ts` | Collection and snapshot modules are removed from release bundles |
| Workflow Debug Probe | `workflowDebugProbe.ts` | Probe tool hidden from UI |
| Plugin Skill Registry | `pluginSkillRegistry.ts` | `debug_only: true` skills excluded from registry |
| Host Bridge Capability Registry | `hostBridgeCapabilityRegistry.ts` | Debug capabilities filtered from listings |
| Local Deploy Debug Store | `skillRunnerLocalDeployDebugStore.ts` | Debug store writes become no-ops |
| Selection Sample | `selectionSample.ts` | Sample/validate context menu entries hidden |
| Debug Console Button | `preferenceScript.ts` | Debug console button hidden from preferences UI |
