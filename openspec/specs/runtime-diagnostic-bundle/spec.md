# runtime-diagnostic-bundle Specification

## Purpose
TBD - created by archiving change upgrade-runtime-log-diagnostics-for-issue-and-agent-debugging. Update Purpose after archive.
## Requirements
### Requirement: Diagnostic Bundle Export SHALL Follow RuntimeDiagnosticBundleV1 Schema
The system SHALL keep exporting developer diagnostics as a single JSON document `RuntimeDiagnosticBundleV1` for raw retained-log debugging.

#### Scenario: Export developer bundle baseline structure
- **WHEN** developer/raw diagnostic export is requested
- **THEN** the output JSON SHALL include `schemaVersion`, `meta`, `filters`, `timeline`, `incidents`, and `entries`
- **AND** `entries` SHALL preserve sanitized raw log rows for machine processing
- **AND** this raw retained-log export SHALL NOT be the default user-facing issue diagnostic bundle.

### Requirement: Diagnostic Bundle Export SHALL Include Environment Fingerprint by Default
The bundle SHALL include non-sensitive environment fingerprint data for reproducibility.

#### Scenario: Build bundle meta section
- **WHEN** export runs under default settings
- **THEN** `meta` SHALL include plugin version, Zotero/runtime version, platform summary, locale, and export time window
- **AND** explicit credentials/secrets SHALL NOT appear in meta fields

### Requirement: Diagnostic Bundle Export SHALL Enforce Balanced Redaction
The export MUST apply balanced redaction and payload summarization rules.

#### Scenario: Sensitive field present in log details
- **WHEN** exported entries contain secret-bearing keys or values
- **THEN** those values SHALL be redacted
- **AND** large text payloads SHALL be exported as truncated preview plus digest hash instead of full raw content

### Requirement: Diagnostic Bundle Export SHALL Provide Incident Aggregation
The export SHALL include aggregated incident chains to speed issue triage.

#### Scenario: Request has retries and terminal failure
- **WHEN** timeline includes retry and terminal events for the same request/job chain
- **THEN** `incidents` SHALL summarize first-failure point, retry trajectory, and terminal outcome with correlation IDs

### Requirement: Developer diagnostics may include bounded ACP performance profiles

The developer runtime diagnostic bundle SHALL include an optional `performanceProfiles` aggregate only when the debug-only ACP runtime profiler is explicitly enabled and has data. Building the bundle SHALL take one immutable profiler snapshot and SHALL NOT expose raw samples or cause runtime profiling persistence.

#### Scenario: Enabled profiler is exported

- **WHEN** a developer diagnostic bundle is explicitly built while a debug profiler contains data
- **THEN** the bundle SHALL contain one bounded `performanceProfiles` snapshot.

#### Scenario: Inactive profiler is omitted

- **WHEN** debug mode or explicit profiler activation is absent, or no profile data exists
- **THEN** the bundle SHALL omit `performanceProfiles`.

