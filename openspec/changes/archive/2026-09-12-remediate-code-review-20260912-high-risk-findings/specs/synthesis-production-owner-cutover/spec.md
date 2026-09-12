## MODIFIED Requirements

### Requirement: Failed production ownership SHALL be recoverable explicitly

A deterministic startup failure SHALL remain terminal until a caller explicitly requests recovery. Endpoint-start or supervisor-construction failure SHALL best-effort stop any endpoint created by that failed generation before retaining the terminal failure. Recovery SHALL clear failed promise ownership, start one new supervised generation, and never overlap with or reuse resources from the failed generation.

#### Scenario: User retries a corrected startup

- **WHEN** startup failed, the underlying cause was corrected, and the user invokes retry
- **THEN** the production owner creates one new startup generation
- **AND** all production consumers observe that generation rather than a permanently cached rejection.

#### Scenario: Endpoint setup fails

- **WHEN** endpoint startup or supervisor construction fails
- **THEN** the owner SHALL best-effort stop the created endpoint
- **AND** an ordinary start call SHALL continue to observe the terminal failure until explicit recovery.
