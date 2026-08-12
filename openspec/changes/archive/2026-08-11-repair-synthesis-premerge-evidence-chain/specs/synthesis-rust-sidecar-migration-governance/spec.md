## ADDED Requirements

### Requirement: Acceptance SHALL require one source-fresh evidence chain

Sidecar acceptance SHALL require all four application differential gates, the governed 2k/10k/25k production-route performance gate, and the complete unfiltered core suite to pass from the same candidate source identity. Intentional differential normalization SHALL be exact, role-specific, and centrally owned.

#### Scenario: Candidate is proposed for acceptance
- **WHEN** any required gate has no current-source sample, fails, is filtered, or relies on a broad table or payload allowance
- **THEN** acceptance remains blocked

#### Scenario: Rust has the registered redirect-graph migration marker
- **WHEN** the Rust parity database contains the exact registered marker absent from the baseline Node oracle
- **THEN** the central parity policy may omit only that exact Rust key/value row
- **AND** every other schema row remains part of the differential
