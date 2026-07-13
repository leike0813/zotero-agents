## Why

The existing Live Capture path records already-derived profiler data while real ACP work is running, so it cannot provide a repeatable workload or isolate instrumentation cost from backend, transport, and host mutations. We need a local raw semantic trace that can be replayed without a backend and profiled across controlled Workspace surfaces.

## What Changes

- Replace the debug-only Live Capture workflow with two mutually exclusive source-switched capabilities: ACP Trace Recorder and ACP Replay Profiler.
- Add a versioned, lossless local semantic trace contract for Chat conversations and Workflow executions, including ownership, lifecycle, notifications, permission outcomes, diagnostics, terminal state, integrity metadata, quotas, and incomplete-state handling.
- Add a backend-free replay engine with source-specific Chat and Skills targets, recorded and burst cadence, synthetic owner isolation, automatic Workspace surface control, R2 synthetic workload injection, drain handling, and restoration of the user's Workspace state.
- Generate a versioned nine-run replay matrix with three warm-ups, six formal profiles, provenance, completeness data, per-surface summaries, and strict comparison compatibility rules.
- Replace the Dashboard Live Capture tab with separate Recorder and Replay Profiler tabs; raw traces remain local and expose no copy, upload, or submission path.
- Retain the deterministic automated three-surface matrix only as a CI mechanism smoke baseline and document Gecko Profiler as a separate CPU-stack tool.
- **BREAKING** Remove the Live Capture Start/Refresh/Stop/Copy user workflow and its governance-baseline role.

## Capabilities

### New Capabilities

- `acp-runtime-semantic-trace`: Lossless debug-only ACP semantic trace capture, integrity, quota, local persistence, and source ownership contract.
- `acp-runtime-replay-profiler`: Backend-free source-specific replay, synthetic workload, Workspace surface matrix, profiling, completeness, and result-report contract.

### Modified Capabilities

- `acp-runtime-performance-profiler`: Separate profile lifecycle and symmetric Chat/Skills surface attribution from live workload capture, with independent source-switch release elision.
- `acp-runtime-performance-baseline`: Reclassify the automated matrix as a smoke baseline and make replay matrices the comparable real-workload baseline families.

## Impact

- ACP connection/session semantic event publication, Chat prompting, Workflow lifecycle, permission and terminal paths.
- Chat conversation projection/persistence and ACP Skills run/transcript publication seams.
- Debug-mode source switches, profiler instrumentation, Dashboard snapshot/actions/UI/localization, local file persistence, and shutdown cleanup.
- Existing profiler/baseline tests, new recorder/replay tests, release-elision checks, production builds, performance documentation, test guidance, and risk audit.
