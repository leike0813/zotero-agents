## Context

ACP silent execution avoids most transcript DOM work but still performs JSON-RPC diagnostics, synchronous run persistence, Host Bridge request handling, panel snapshot construction, and queue/buffer work on Zotero's main thread. Existing test performance probes capture suite-level spans and resource snapshots; they are not request-scoped and cannot safely collect every ACP update.

The plugin already has a build-time debug flag (`__debug_mode__`) and a test override in `debugMode.ts`. The profiler must use that boundary so non-debug releases do not pay a recorder call or branch on hot paths.

## Goals / Non-Goals

**Goals:**

- Provide one bounded SSOT for ACP runtime counters, gauges, durations, attribution, and export.
- Compile all production hot-path instrumentation out of non-debug bundles.
- Require explicit activation inside debug mode and remain inert before activation.
- Cover R1/R2/R3, queues, accumulators, and buffered writes with deterministic automated fixtures.
- Preserve ACP protocol, persistence, Host Bridge, Assistant Workspace, and DOM identity behavior.

**Non-Goals:**

- Fix the measured R1/R2/R3 risks in this change.
- Add a user preference, visible panel, runtime schema, raw sample store, or general APM.
- Claim that mock duration values reproduce Gecko scheduling, mozStorage, XPCOM, structured-clone, GC, or Zotero-version timing.
- Require manual Zotero 7/9 measurements before completion.

## Decisions

### Compile-time debug guard plus explicit activation

Every production hot-path block uses a direct `__debug_mode__` guard with the existing test fallback. Esbuild can fold `false` and remove the block and side-effect-free profiler import. The profiler separately checks `isDebugModeEnabled()` and an explicit enabled flag, so tests and accidental calls cannot activate it outside debug mode.

No preference is added. The test performance digest explicitly enables the profiler only after debug test mode is active. Debug builds that do not enable it allocate no profiler state and start no timer; non-debug builds contain no instrumentation code.

### One bounded aggregate store

The profiler owns a single lazy state containing one global/unattributed aggregate, at most eight active profiles, and the eight most recent completed profiles. Each profile has at most 128 fixed metric series. Duration metrics store count, total, max, and fixed histogram buckets; counters store totals; gauges store current and max. Raw samples and arbitrary labels are prohibited.

Request-aware call sites pass the durable ACP Skills request id. Host Bridge temporarily measures socket input locally, then attributes it from the existing `X-Zotero-Bridge-Scope`; missing or invalid scope goes only to the global aggregate. Shared event-loop drift is global.

### Lifecycle follows durable run terminal state

The orchestrator starts a profile after durable request identity exists. Recovery starts idempotently and does not reset an active profile. The run store finishes it on the first transition to `succeeded`, `failed`, or `canceled`; recoverable and apply-pending states remain active.

### Automated mechanism baseline

Node/Zotero-mock fixtures use injected clock/timer functions, fake transports, fake streams, mock persistence, and fake Assistant Workspace surfaces. They assert counts, byte totals, attribution, peaks, buckets, capacity, and DOM identity—not wall-clock thresholds. Existing shell action trace supplies shell-to-child delivery counts, avoiding production instrumentation in the copied static shell script.

A build check bundles representative real entries with `__debug_mode__` false and true. The false output must assign zero output bytes to the profiler module and contain no schema or metric marker; the true output must retain them.

### Export only at explicit boundaries

Developer and issue diagnostic bundles call the snapshot function once and include `performanceProfiles` only when a debug profiler is enabled and has data. The Zotero performance digest appends the same immutable snapshot at domain end without adding high-frequency raw spans.

## Risks / Trade-offs

- **Mock timing cannot prove real Zotero stalls** → Document real-host measurement as optional calibration and make no performance-improvement claim from fixture timings.
- **Debug mode also enables detailed audit** → Do not present fixture isolation as a production debug-off/debug-on comparison.
- **Tree shaking could regress** → Gate the change on an automated release-elision build check.
- **Instrumentation could perturb debug runs** → Reuse existing serialized lengths, avoid await/log/persistence in recorders, and keep all structures bounded.
- **Unscoped Host Bridge work may be ambiguous** → Store it once in the global aggregate and never guess an active request.

