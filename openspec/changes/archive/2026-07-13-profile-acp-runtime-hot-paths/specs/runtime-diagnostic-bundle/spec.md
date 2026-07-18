## ADDED Requirements

### Requirement: Developer diagnostics may include bounded ACP performance profiles

The developer runtime diagnostic bundle SHALL include an optional `performanceProfiles` aggregate only when the debug-only ACP runtime profiler is explicitly enabled and has data. Building the bundle SHALL take one immutable profiler snapshot and SHALL NOT expose raw samples or cause runtime profiling persistence.

#### Scenario: Enabled profiler is exported

- **WHEN** a developer diagnostic bundle is explicitly built while a debug profiler contains data
- **THEN** the bundle SHALL contain one bounded `performanceProfiles` snapshot.

#### Scenario: Inactive profiler is omitted

- **WHEN** debug mode or explicit profiler activation is absent, or no profile data exists
- **THEN** the bundle SHALL omit `performanceProfiles`.

