## ADDED Requirements

### Requirement: Synthesis Workbench SHALL identify and protect builtin status rows
The Workbench MUST expose builtin identity in its row model and render a builtin marker. It MUST disable tag/facet identity editing and deletion while keeping note and existing aliases governance available.

#### Scenario: User edits a builtin row
- **WHEN** a builtin status row is selected
- **THEN** tag and facet identity controls and delete action SHALL be unavailable
- **AND** note editing SHALL remain available

#### Scenario: User manages a custom status row
- **WHEN** a non-builtin `status:*` row is selected
- **THEN** ordinary edit and delete operations SHALL remain available

### Requirement: Host commands SHALL enforce builtin protection independently of UI
Commands that save, import, remove, deprecate, or promote controlled vocabulary entries MUST apply builtin policy even when invoked without Workbench controls.

#### Scenario: Direct command attempts builtin deletion or identity change
- **WHEN** a caller bypasses UI and submits a builtin deletion, rename, facet change, or deprecation
- **THEN** the command SHALL reject or normalize the operation
- **AND** the builtin SHALL remain canonical in persistence

#### Scenario: Import preview omits builtin definitions
- **WHEN** an imported vocabulary omits one or more builtin definitions
- **THEN** preview SHALL distinguish retained builtin definitions from ordinary entries
- **AND** applying the import SHALL not remove them
