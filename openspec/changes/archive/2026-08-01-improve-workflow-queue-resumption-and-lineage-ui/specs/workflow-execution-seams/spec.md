## ADDED Requirements

### Requirement: Execution seams SHALL coordinate submission slot ownership explicitly

The submission execution context SHALL expose typed operations to yield a held slot, request priority resumption, cancel an unsent resumption, and ensure a slot before Host apply. These operations SHALL accept normalized Host reason values and SHALL NOT require the queue to interpret provider-specific status strings.

#### Scenario: Waiting provider yields through the run seam

- **WHEN** the run seam projects waiting-user, waiting-auth, or recoverable failure
- **THEN** it SHALL map the provider state to a normalized Host yield reason
- **AND** invoke the unit's idempotent yield operation

#### Scenario: Apply follows yielded execution

- **WHEN** a yielded provider run becomes terminal with an applicable result
- **THEN** the apply seam SHALL await priority slot reacquisition before invoking Host apply

