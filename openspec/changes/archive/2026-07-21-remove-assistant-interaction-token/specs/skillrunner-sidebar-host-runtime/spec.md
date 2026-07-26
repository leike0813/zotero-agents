## MODIFIED Requirements

### Requirement: SkillRunner waiting-user replies are canonical and interaction-id-bound

The SkillRunner host runtime SHALL route Assistant waiting-user actions through the current selected run and preserve the backend-native numeric interaction id required by the SkillRunner API. The Assistant DTO and child action SHALL NOT expose a duplicate interaction token.

#### Scenario: Current quick reply is submitted

- **WHEN** the user submits text or a typed option for the selected waiting run
- **THEN** the host SHALL read the current pending `interactionId`
- **AND** submit that id and the canonical response to the backend.

#### Scenario: File interaction changes during selection

- **WHEN** the native picker completes after the current pending interaction id or waiting state changed
- **THEN** the host SHALL not upload the selected files
- **AND** the Assistant child SHALL not need to echo an interaction token.
