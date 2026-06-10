## ADDED Requirements

### Requirement: UI Harness SHALL mock Revise Canonicals write actions

The readonly UI harness SHALL surface Revise Canonicals data from the synthesis readonly service while blocking write actions.

#### Scenario: User triggers canonical write action in harness

- **WHEN** the harness receives canonical merge, apply pending, metadata update, or archive commands
- **THEN** it SHALL add the command to the mock action log
- **AND** it SHALL classify the blocked reason as `db-write`
- **AND** it SHALL NOT write Zotero DB, plugin DB, filesystem, clipboard, or backend state.

#### Scenario: User checks harness diagnostics

- **WHEN** harness status is requested
- **THEN** synthesis diagnostics SHALL include available canonical revision proposal and mock action counts where available.
