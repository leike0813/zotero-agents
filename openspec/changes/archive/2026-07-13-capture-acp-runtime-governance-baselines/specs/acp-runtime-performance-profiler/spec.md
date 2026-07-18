## MODIFIED Requirements

### Requirement: ACP runtime profiling is debug-only and source-enabled

ACP runtime profiling SHALL be available only when debug mode and the hard-coded
profiler feature switch in `debugMode.ts` are enabled. Recording SHALL begin
only after an explicit capture-start action. Non-debug production bundles and
debug bundles built with the profiler switch disabled SHALL eliminate profiler
hot-path code, imports, metric markers, and branches.

#### Scenario: Non-debug bundle is profiler-free

- **WHEN** the plugin entry is bundled with `__debug_mode__` set to false
- **THEN** the profiler module SHALL contribute zero output bytes
- **AND** the output SHALL contain no profiler schema or metric markers.

#### Scenario: Source-disabled debug bundle is profiler-free

- **WHEN** the plugin entry is bundled in debug mode with the hard-coded
  profiler feature switch set to false
- **THEN** profiler recorder and capture modules SHALL contribute no runtime
  state, timer, persistence, or hot-path work.

#### Scenario: Available profiler remains idle before capture

- **WHEN** debug mode and the profiler feature switch are enabled but no capture
  has been started
- **THEN** the profiler tab SHALL be available
- **AND** no profile, metric map, timer, snapshot, log, or persistence write
  SHALL be created.

#### Scenario: Test activation respects debug mode

- **WHEN** a test requests recording without enabling the debug-mode test
  override
- **THEN** activation SHALL fail and all recorder APIs SHALL remain inert.
