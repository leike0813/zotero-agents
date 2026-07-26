## MODIFIED Requirements

### Requirement: Workflow validation SHALL not start execution

Host Bridge SHALL provide workflow validation and requirements endpoints that validate workflow-owned selection, workflow options, and execution-mode requirements without resolving or validating a provider profile and without starting tasks or requesting execution approval.

#### Scenario: Workflow validation checks workflow input only

- **WHEN** a client calls `POST /bridge/v1/workflows/validate`
- **THEN** Host Bridge validates selection, workflow options, and execution-mode requirements
- **AND** it does not read a default provider profile or return a backend-specific provider option schema
- **AND** no workflow task, backend run, Zotero mutation, or execution approval request is created.

## ADDED Requirements

### Requirement: Workflow submission SHALL join independently validated contracts
Workflow submission SHALL independently validate workflow input and the submitted provider profile, then check workflow provider requirements against backend capabilities before requesting approval or dispatching execution.

#### Scenario: Valid profile is incompatible with workflow
- **WHEN** both contracts validate independently but the backend lacks a required workflow capability
- **THEN** submission returns a workflow-provider compatibility error
- **AND** no approval, task, run, or backend request is created.

### Requirement: Provider profile endpoints SHALL be workflow-independent
Host Bridge SHALL expose backend profile list, describe, and validate operations that do not accept a workflow identifier.

#### Scenario: Provider profile is validated
- **WHEN** a client validates a provider profile
- **THEN** Host Bridge returns normalized backend-owned options or structured provider errors
- **AND** it does not evaluate workflow selection, parameters, or compatibility.
