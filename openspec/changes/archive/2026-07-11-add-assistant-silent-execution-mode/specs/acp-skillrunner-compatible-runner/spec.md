## ADDED Requirements

### Requirement: ACP Skills silent projection does not alter execution semantics

Silent mode SHALL suppress ACP Skills process projection before transcript persistence while preserving prompt execution, assistant output accumulation for validation, permission handling, recovery, timeout, cancellation, output convergence, and audit ownership.

#### Scenario: suppressed protocol updates still support final output

- **WHEN** a silent ACP Skills prompt uses thoughts and tools before producing valid output
- **THEN** those process updates do not enter transcript state
- **AND** validation and final output completion behave as in other display modes.

#### Scenario: dynamic mode change applies immediately

- **WHEN** the global mode changes during an active prompt
- **THEN** subsequent updates use the new policy
- **AND** omitted updates are neither deleted from prior history nor backfilled later.

