## ADDED Requirements

### Requirement: Issue diagnostics may include aggregate ACP performance evidence

The one-click issue diagnostic bundle SHALL include optional bounded ACP `performanceProfiles` when the debug-only profiler is explicitly enabled and has data. The aggregate SHALL preserve the issue bundle's redaction and no-raw-log defaults.

#### Scenario: Copy issue bundle with profiler evidence

- **WHEN** the user copies an issue diagnostic bundle during an explicitly enabled debug profiling session
- **THEN** the output SHALL include bounded aggregate performance evidence
- **AND** it SHALL NOT include raw timing samples, user text, paths, commands, or secret-bearing values.

#### Scenario: Normal issue bundle is unchanged

- **WHEN** the profiler is inactive or empty
- **THEN** the issue diagnostic bundle SHALL retain its existing shape without `performanceProfiles`.

