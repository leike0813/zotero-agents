## Why

The committed automated before-governance baseline covers only the
`acp-active` surface, so it cannot prove the expected R3 difference between a
closed Workspace, an open but inactive ACP Skills surface, and the active ACP
Skills surface. The automated evidence should mirror the three-state real-host
campaign before R3 governance begins.

## What Changes

- Run the same deterministic R1, R2, and buffered-write workload for `closed`,
  `open-inactive`, and `acp-active` surface states.
- Omit the R3 publication seam for `closed`, and drive the same production R3
  adapter with inactive and active tabs for the other two states.
- Protect and compare the complete three-record matrix as one recording unit.
- Replace the single automated JSON artifact with three surface-specific JSON
  records and one consolidated Markdown report.
- Update baseline documentation and the audit to describe the matrix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-runtime-performance-baseline`: Automated before-governance evidence
  covers all three Assistant Workspace surface states with explicit R3
  invariants.

## Impact

This affects the deterministic test harness, baseline recording script,
committed performance artifacts, focused baseline tests, documentation, and the
existing performance-baseline specification. It does not change the profiler
DTO, Dashboard host capture, runtime instrumentation, or release behavior.
