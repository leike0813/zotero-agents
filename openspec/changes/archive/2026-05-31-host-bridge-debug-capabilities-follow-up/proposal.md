## Why

Synthesis Layer debugging now depends on scattered UI state, SQLite state, queue
rows, job progress, note payloads, and workflow runtime state. During heavy
refactoring, developers need a bounded, machine-readable Host Bridge and CLI
debug surface that can inspect and advance this state without exposing debug
operations in normal builds.

## What Changes

- Add a hard-gated `debug.*` Host Bridge capability family that is hidden from
  the manifest when `isDebugModeEnabled()` is false and is rejected as
  `capability_not_found` even if called directly.
- Add global debug snapshots for Host Bridge status, runtime persistence, active
  workflow tasks, ACP runs, and backend runtime state.
- Add Synthesis-specific debug capabilities for snapshot, dirty queue, job
  progress, single-paper inspection, single-topic inspection, DB/cache diff,
  worker execution, maintenance execution, queue control, stale job cleanup, and
  dangerous queue reset.
- Add `zotero-bridge debug ...` semantic CLI commands that map to the debug
  capabilities and return `debug_mode_disabled` before calling when the manifest
  does not expose `debug.*`.
- Keep ordinary diagnostic and worker-run debug operations approval-free, while
  dangerous debug operations require Zotero UI approval and a fixed
  confirmation phrase.
- Preserve safety boundaries: bounded output, no token leakage, no absolute
  local paths by default, and no arbitrary SQL or arbitrary file access.

## Capabilities

### New Capabilities

- `host-bridge-debug-capabilities`: Debug-only Host Bridge capabilities for
  global runtime and Synthesis diagnostics, queue/job control, worker runs, and
  dangerous debug maintenance actions.
- `host-bridge-cli-debug-commands`: Semantic `zotero-bridge debug ...` commands
  that discover and call debug capabilities through the Host Bridge manifest.

### Modified Capabilities

- None.

## Impact

- Plugin modules:
  - Host Bridge capability registry, manifest filtering, approval policy, and
    debug mode gate.
  - Runtime persistence diagnostics and task/workflow snapshots.
  - Synthesis service/repository debug read APIs, worker runner entry points,
    queue control, and job progress cleanup.
- CLI:
  - Rust command model, input parsing reuse, debug command dispatch, manifest
    preflight, error mapping, packaging.
- Tests:
  - Host Bridge debug gate and approval tests.
  - CLI debug namespace mapping and disabled-mode tests.
  - Synthesis diagnostics, worker-run, stale job, and dangerous queue-clear
    tests.
- Documentation:
  - Host Bridge CLI manual and debug-mode usage notes.
  - Agent-facing guidance for using debug commands only in debug mode.
