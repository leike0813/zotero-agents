## Why

The existing ACP runtime profiler proves bounded aggregation, but its committed
1,000-update fixture calls recorder APIs directly and therefore cannot serve as
an auditable pre-governance baseline for the real R1/R2/R3 production paths.
Developers also lack a contained way to capture and export the same evidence in
an actual Zotero host.

## What Changes

- Replace the direct-recorder baseline with a deterministic production-seam
  fixture and commit a versioned before-governance JSON/Markdown record.
- Add a debug-only, source-controlled profiler feature switch and preserve
  release/switch-off elimination of profiler hot-path work.
- Add an isolated ACP Runtime Profiler Dashboard tab for starting, inspecting,
  freezing, saving, copying, and locating real-host captures.
- Define one sanitized baseline-record DTO and R1/R2/R3 summary mapping shared
  by automated and Zotero-host capture paths.
- Document a repeatable Zotero 7/9 silent-mode measurement procedure without
  claiming real-host latency from deterministic fixtures.

## Capabilities

### New Capabilities

- `acp-runtime-performance-baseline`: Deterministic governance baseline records,
  debug-only Dashboard capture sessions, sanitized export, and real-host
  operating guidance.

### Modified Capabilities

- `acp-runtime-performance-profiler`: Profiler availability is controlled by a
  hard-coded debug feature switch, while recording remains explicitly started
  and release/switch-off hot paths remain eliminated.

## Impact

This affects the profiler lifecycle, Assistant Workspace profiling test seam,
Task Manager Dashboard snapshot/action/rendering, runtime-profile persistence,
OpenSpec and audit documentation, and focused core/UI/build-elision tests. It
adds no dependency, preference, environment variable, public Zotero API, or
non-debug runtime behavior.
