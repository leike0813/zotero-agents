## MODIFIED Requirements

### Requirement: ACP runtime profiling is debug-only and source-enabled

ACP runtime profiling SHALL be available only when debug mode and its independent hard-coded profiler source switch are enabled. It SHALL activate only for replay profile windows or deterministic mechanism fixtures and SHALL remain disabled during semantic trace capture. Non-debug production bundles and profiler-switch-disabled debug bundles SHALL eliminate profiler modules, imports, metric markers, profile-context computation, map lookups, synthetic publication attribution, and hot-path branches.

#### Scenario: Non-debug bundle is profiler-free

- **WHEN** the plugin entry is bundled with `__debug_mode__` set to false
- **THEN** the profiler module and Replay-only production ports SHALL contribute zero output bytes
- **AND** the output SHALL contain no profiler schema, metric, profile-context, synthetic-helper, or publication-attribution marker.

#### Scenario: Source-disabled debug bundle is profiler-free

- **WHEN** the plugin entry is bundled in debug mode with the profiler source switch set to false
- **THEN** profiler recorder and replay profiling adapters SHALL contribute no runtime state, context lookup, timer, persistence, publication acknowledgement, or hot-path work.

#### Scenario: Trace capture excludes profiling

- **WHEN** the semantic trace recorder is armed, recording, or frozen
- **THEN** no replay profile SHALL be active and no profiler aggregate SHALL be allocated for captured work.

#### Scenario: Test activation respects debug mode

- **WHEN** a test requests profiling without enabling the debug-mode test override
- **THEN** activation SHALL fail and all profiler APIs SHALL remain inert.
