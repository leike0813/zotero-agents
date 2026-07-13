## ADDED Requirements

### Requirement: Test performance diagnostics exercise the debug runtime profiler automatically

When the performance probe environment flag is enabled in a debug test runtime, the shared test harness SHALL explicitly enable the ACP runtime profiler and append one bounded aggregate snapshot to the domain-end digest. High-frequency runtime metrics SHALL NOT be copied into the existing raw span array.

#### Scenario: Debug test digest includes runtime aggregate

- **WHEN** `ZOTERO_TEST_PERF_PROBE` and debug test mode are enabled
- **THEN** the domain-end digest SHALL include one ACP runtime performance snapshot
- **AND** flush SHALL still write the digest only once.

#### Scenario: Non-debug test cannot bypass activation

- **WHEN** `ZOTERO_TEST_PERF_PROBE` is set without debug mode
- **THEN** the runtime profiler SHALL remain inactive and its aggregate SHALL be absent.

### Requirement: Real-host profiling is optional calibration

The required performance-probe gate SHALL be satisfied by deterministic mechanism fixtures. Zotero 7 and Zotero 9 real-host timing runs MAY be collected for diagnosis but SHALL NOT be required to complete or archive the change.

#### Scenario: Automated gate without real-host artifact

- **WHEN** all deterministic profiler and release-elision tests pass without a real-host artifact
- **THEN** the performance-probe contract SHALL be considered satisfied
- **AND** documentation SHALL distinguish mechanism validation from real-host latency evidence.

