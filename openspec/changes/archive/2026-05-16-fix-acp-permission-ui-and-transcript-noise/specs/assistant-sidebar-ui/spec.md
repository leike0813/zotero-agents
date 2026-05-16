## ADDED Requirements

### Requirement: Shared ACP permission approval UI

The Assistant panel shared renderer SHALL render ACP Chat and ACP Skills permission approval prompts as compact readable cards.

#### Scenario: Permission prompt is compact and readable
- **GIVEN** an ACP permission interaction with summary, detail, and approval options
- **WHEN** the shared Assistant panel renderer renders the hint region
- **THEN** the permission summary SHALL be one line with overflow ellipsis
- **AND** approval options SHALL render as compact full-width buttons
- **AND** raw JSON detail SHALL NOT be expanded inline in the hint region
- **AND** a `View full request` action SHALL be available.

#### Scenario: Full request opens internal readable bottom sheet
- **GIVEN** the user clicks `View full request`
- **WHEN** the action is handled by ACP Chat or ACP Skills
- **THEN** a dedicated permission bottom sheet SHALL open from the bottom of the current panel
- **AND** it SHALL show a readable command/request DTO
- **AND** it SHALL include the same permission action buttons
- **AND** it SHALL NOT show the full raw transcript payload
- **AND** it SHALL NOT replace or alter the generic details drawer content.

### Requirement: Workspace activity transcript display

ACP Skills workspace activity transcript rows SHALL display a concise file activity row.

#### Scenario: Workspace activity uses relative path
- **GIVEN** a workspace activity transcript item with `details.relativePath`
- **WHEN** the transcript renderer renders it
- **THEN** it SHALL display a file icon and the relative path
- **AND** it SHALL NOT display the verbose workspace activity sentence.
