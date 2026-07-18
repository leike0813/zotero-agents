## MODIFIED Requirements

### Requirement: ACP runtime profiling is debug-only and source-enabled

ACP runtime profiling SHALL be available only when debug mode and its independent hard-coded profiler source switch are enabled. It SHALL activate only for replay profile windows or deterministic mechanism fixtures and SHALL remain disabled during semantic trace capture. Non-debug production bundles and profiler-switch-disabled debug bundles SHALL eliminate profiler hot-path code, imports, metric markers, and branches.

#### Scenario: Non-debug bundle is profiler-free
- **WHEN** the plugin entry is bundled with `__debug_mode__` set to false
- **THEN** the profiler module SHALL contribute zero output bytes
- **AND** the output SHALL contain no profiler schema or metric markers.

#### Scenario: Source-disabled debug bundle is profiler-free
- **WHEN** the plugin entry is bundled in debug mode with the profiler source switch set to false
- **THEN** profiler recorder and replay profiling adapters SHALL contribute no runtime state, timer, persistence, or hot-path work.

#### Scenario: Trace capture excludes profiling
- **WHEN** the semantic trace recorder is armed, recording, or frozen
- **THEN** no replay profile SHALL be active and no profiler aggregate SHALL be allocated for captured work.

#### Scenario: Test activation respects debug mode
- **WHEN** a test requests profiling without enabling the debug-mode test override
- **THEN** activation SHALL fail and all profiler APIs SHALL remain inert.

### Requirement: Profiling lifecycle follows replay target lifecycle

Chat and ACP Skills replay targets SHALL expose symmetric profile prepare, start, R3 signature/post attribution, drain, and finish lifecycle. A profile SHALL begin only after synthetic ownership and surface preparation drain and SHALL finish exactly once before cleanup.

#### Scenario: Chat target is active
- **WHEN** a Chat trace profile window publishes Workspace work
- **THEN** R3 prepare, signature, and post metrics SHALL be attributed to the Chat synthetic conversation and selected surface.

#### Scenario: Skills target is active
- **WHEN** a Workflow trace profile window publishes Workspace work
- **THEN** the same R3 lifecycle metrics SHALL be attributed to the synthetic workflow/request owners and selected surface.

#### Scenario: Closed surface runs
- **WHEN** a replay profile executes with Workspace closed
- **THEN** it SHALL produce no R3 metrics.

## REMOVED Requirements

### Requirement: Available profiler remains idle before capture
**Reason**: Live profiler capture is replaced by semantic trace recording plus backend-free replay profile windows.
**Migration**: Use ACP Trace Recorder to create a complete local trace, then ACP Replay Profiler to generate profiles.

### Requirement: Profiling lifecycle follows ACP run lifecycle
**Reason**: Real ACP run profiling couples measurements to non-repeatable backend and host work.
**Migration**: Profile source-specific synthetic replay owners within fixed surface windows.
