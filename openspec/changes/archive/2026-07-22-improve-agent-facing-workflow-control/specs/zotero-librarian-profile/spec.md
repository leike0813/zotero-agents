## ADDED Requirements

### Requirement: Librarian guidance SHALL separate workflow and provider contracts
The resident profile SHALL describe provider profiles as backend-scoped request input and SHALL not present them as workflow-owned settings or Host-persisted resources.

#### Scenario: Resident agent plans workflow work
- **WHEN** the profile evaluates a candidate workflow
- **THEN** it inspects workflow requirements and provider capabilities separately
- **AND** it does not infer provider options from the workflow id.

### Requirement: Librarian profile SHALL document the ordered research journey
The profile SHALL index the six-stage research journey while preserving resident planning, monitoring, approval, and maintenance boundaries.

#### Scenario: Scheduled work encounters a mutating stage
- **WHEN** a scheduled pass reaches sidecar refresh, graph update, workflow submit, or apply-back
- **THEN** it records or reports the required action
- **AND** does not bypass the current Host approval contract.
