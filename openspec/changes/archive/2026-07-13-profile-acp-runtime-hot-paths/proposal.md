## Why

Silent ACP execution still has several code-confirmed Zotero main-thread stall risks, but the project lacks bounded request-scoped measurements that can distinguish event volume, synchronous work, queue growth, and UI publication cost. The profiler must be safe enough to leave in the codebase: available only in debug builds, explicitly enabled, completely eliminated from non-debug bundles, and verifiable through deterministic automation rather than mandatory manual Zotero profiling.

## What Changes

- Add a debug-only, explicitly enabled ACP runtime performance profiler with bounded request and global aggregates.
- Instrument the R1 JSON-RPC/persistence path, R2 Host Bridge request path, R3 Assistant Workspace publication path, and related queue/buffer growth without changing business behavior.
- Add profiler aggregates to developer and issue diagnostic bundles only while the profiler is enabled and has data.
- Add deterministic Node/Zotero-mock fixtures for silent execution hot paths and a build check proving non-debug bundles contain no profiler code.
- Keep real Zotero 7/9 timing captures as optional diagnostic calibration rather than a completion gate.

## Capabilities

### New Capabilities

- `acp-runtime-performance-profiler`: Debug-only activation, bounded metrics, attribution, export, automated fixtures, and release-build elimination.

### Modified Capabilities

- `runtime-diagnostic-bundle`: Developer diagnostic exports may include a bounded ACP performance profile snapshot.
- `issue-diagnostic-bundle`: One-click issue diagnostics may include the same aggregate snapshot without raw samples.
- `zotero-test-performance-probe-contract`: Automated performance diagnostics must exercise the runtime profiler in debug test mode and treat real-host timing as optional calibration.

## Impact

The change touches ACP connection, run persistence, Host Bridge, Assistant Workspace publication, transport/buffer accounting, runtime diagnostic exports, test diagnostics, and debug-mode documentation. It adds no user-facing preference, persistent runtime schema, dependency, backend-specific behavior, or release-build hot-path cost.
