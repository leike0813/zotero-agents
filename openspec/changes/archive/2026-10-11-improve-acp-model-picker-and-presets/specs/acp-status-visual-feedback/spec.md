## ADDED Requirements

### Requirement: Connect action SHALL immediately display bounded busy state

ACP Chat SHALL disable its connect action and show connecting feedback before asynchronous connection preparation. All startup phases SHALL retain busy feedback; completion, authentication requirement and failure SHALL end it. Repeated connection requests for the same owner SHALL share pending work while different owners remain independent.

#### Scenario: Connection preparation is pending
- **WHEN** the user initiates connection and preparation has not completed
- **THEN** the action SHALL be disabled with spinner and busy accessibility state, and a repeated request SHALL not start another adapter.

#### Scenario: Connection fails
- **WHEN** connection preparation fails
- **THEN** the action SHALL leave busy state and expose the error through the existing diagnostics path.
