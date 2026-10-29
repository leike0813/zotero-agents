## ADDED Requirements

### Requirement: Transport termination SHALL release pending permission waits

ACP transport termination SHALL release permission waits so outstanding calls and connection observation can settle. The adapter SHALL still drain final buffered messages and retain terminal transport diagnostics.

#### Scenario: Backend exits during an unanswered permission request

- **WHEN** the backend process exits while the caller has not answered a permission request
- **THEN** the prompt settles and the adapter publishes its terminal close observation
- **AND** no user response is required to complete shutdown
