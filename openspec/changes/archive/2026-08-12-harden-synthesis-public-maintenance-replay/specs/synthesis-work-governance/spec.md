## ADDED Requirements

### Requirement: Public maintenance request replay SHALL reuse the first durable operation

The native runtime SHALL derive public maintenance operation identity from the stable request ID, capability, and canonical argument basis without using acceptance time. Only the request that first creates that identity SHALL start work or publish maintenance lifecycle events; an identical replay SHALL return the existing durable receipt in its current state.

#### Scenario: Accepted request is replayed

- **WHEN** the same request ID, capability, and canonical arguments are submitted again while the operation is pending, running, or terminal
- **THEN** the runtime SHALL return the original operation ID and persisted receipt
- **AND** it SHALL NOT start another worker, acquire another maintenance epoch, or repeat Host effects

#### Scenario: Caller submits a new request identity

- **WHEN** the caller submits the same capability and arguments with a different request ID
- **THEN** the runtime SHALL treat it as a distinct requested operation

## MODIFIED Requirements

### Requirement: Startup SHALL cancel stale Synthesis runtime operations

Synthesis startup reconciliation SHALL classify every persisted non-terminal operation before those rows are surfaced as active Workbench jobs. A public maintenance operation that was pending SHALL require explicit continuation. A public maintenance operation that was running SHALL fail with an unknown external-effect outcome rather than being reported as canceled or replayed. Other persisted running operation rows SHALL be canceled as stale. Ordinary progress, chrome, client, debug, and service-construction reads SHALL remain read-only and SHALL NOT classify operations based on elapsed timestamp age.

#### Scenario: Public maintenance operation was pending

- **GIVEN** a public maintenance receipt is persisted with status `pending`
- **WHEN** startup runtime work reconciliation runs
- **THEN** the receipt SHALL remain pending with phase `continuation_required`
- **AND** no maintenance work or Host effect SHALL start automatically

#### Scenario: Public maintenance operation was running

- **GIVEN** a public maintenance receipt is persisted with status `running`
- **WHEN** startup runtime work reconciliation runs
- **THEN** the receipt SHALL become failed with phase `restart_reconciliation_failed`
- **AND** its diagnostics SHALL report `restart_external_effect_unknown`

#### Scenario: Other running operation was left by the previous session

- **GIVEN** a non-public-maintenance Synthesis operation row is persisted with status `running`
- **WHEN** startup runtime work reconciliation runs
- **THEN** the operation SHALL be updated to `canceled`
- **AND** its diagnostics SHALL include `synthesis_operation_stale_after_restart`
- **AND** Workbench background jobs SHALL NOT count it as running

#### Scenario: Running operation is read during the current session

- **GIVEN** a Synthesis operation row remains `running` during the current session regardless of its timestamp age
- **WHEN** an ordinary progress, chrome, client, debug, or service-construction read executes
- **THEN** the operation SHALL remain `running`
- **AND** only explicit startup reconciliation SHALL classify persisted running state as a restart orphan

#### Scenario: Reconciliation exceeds one storage page

- **GIVEN** more non-terminal operations exist than one bounded repository page can return
- **WHEN** startup runtime work reconciliation runs
- **THEN** it SHALL classify every matching operation through stable pagination
- **AND** terminal operation rows SHALL remain unchanged
