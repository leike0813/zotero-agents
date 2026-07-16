## MODIFIED Requirements

### Requirement: Chat presentation uses one actionable navigation catalog

ACP Chat banner, selectors, session drawer, and actions SHALL resolve the same
complete backend/session navigation catalog and canonical owners.

#### Scenario: A drawer displays another session

- **WHEN** the user selects or archives that session
- **THEN** the action targets the displayed session
- **AND** session, runtime, and conversation identifiers are not substituted.
