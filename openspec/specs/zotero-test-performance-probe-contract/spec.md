# zotero-test-performance-probe-contract Specification

## Purpose
TBD - created by archiving change zotero-test-performance-probe-digest. Update Purpose after archive.
## Requirements
### Requirement: Real-host performance diagnosis MUST emit one staged digest

Real Zotero performance diagnosis MUST write one structured digest so tail degradation can be attributed to cost growth rather than guessed from residual counts.

#### Scenario: Performance digest records spans and host snapshots

- **WHEN** `ZOTERO_TEST_PERF_PROBE` is enabled
- **THEN** the shared Zotero test harness MUST capture snapshots for `test-start`, `pre-cleanup`, `post-background-cleanup`, `post-object-cleanup`, and `domain-end`
- **AND** it MUST record timing spans for the retained real-host operations under diagnosis
- **AND** it MUST include event-loop lag and host resource metrics in the final JSON output

#### Scenario: Diagnostic outputs default to artifact directory

- **WHEN** no explicit output override is provided
- **THEN** performance and leak probe digests MUST default to `artifact/test-diagnostics/`

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

