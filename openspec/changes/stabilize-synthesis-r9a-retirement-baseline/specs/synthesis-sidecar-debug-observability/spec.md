## ADDED Requirements

### Requirement: Advanced Matching SHALL use the real worker contract

The native production adapter SHALL build the strict binding and dedupe worker
requests, execute both through the generic paged child-worker protocol, and
promote their accepted outcomes atomically. Accepted bindings from the first
pass SHALL be excluded from the same-run dedupe input.

#### Scenario: Advanced Matching runs both passes
- **WHEN** a production matching command is accepted
- **THEN** binding completes before dedupe through the real child process
- **AND** identifier evidence, explicit disposition, and same-run exclusion are preserved

#### Scenario: Either pass is not successful
- **WHEN** a worker, validation, basis, or promotion terminal is non-success
- **THEN** no partial matching state is promoted
- **AND** the public command returns its stable semantic status

### Requirement: Failed refresh preparation SHALL be retryable

When reference refresh fails after creating a preparation but before promotion,
the application SHALL terminalize and discard that preparation before
returning the failure.

#### Scenario: Artifact response is truncated
- **WHEN** an artifact read fails after `prepare_refresh`
- **THEN** the preparation operation is no longer running
- **AND** retry in the same sidecar process can prepare and promote normally
