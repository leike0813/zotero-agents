## ADDED Requirements

### Requirement: First-open Chat transcript delivery is self-contained

The first foreground ACP Chat owner after plugin startup SHALL render its indexed selected page after owner-first loading without requiring a session switch, tab switch, later transcript event, or full-mirror hydration. Loss or rejection of the first typed page publication SHALL trigger retained replay or current-owner snapshot rebase.

#### Scenario: Workspace opens before Chat child readiness

- **WHEN** the default Chat page is read before the Chat child declares ready
- **THEN** the page publication is retained and rendered after readiness
- **AND** loading resolves to the ready page without user interaction.

#### Scenario: Page publication observes an old owner

- **WHEN** the active owner's page publication is rejected because owner commit has not completed
- **THEN** the shared delivery path replays it after owner commit or publishes a current-page rebase
- **AND** it is not silently discarded.
