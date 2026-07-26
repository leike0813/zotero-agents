## ADDED Requirements

### Requirement: ACP Chat Drawer Uses Session Semantics

The ACP Chat navigation drawer MUST project visible sessions without task lifecycle sections or empty backend groups.

#### Scenario: Chat session drawer is projected

- **WHEN** ACP Chat has visible conversations across one or more backends
- **THEN** the drawer MUST contain exactly one `sessions` section
- **AND** that section title MUST be hidden
- **AND** conversations MUST retain their canonical navigation order within backend groups.

#### Scenario: Backend has no visible conversation

- **WHEN** a backend exists in the canonical backend catalog but contributes no visible conversation card
- **THEN** that backend MUST NOT appear as a visible drawer group
- **AND** it MUST remain available in canonical owner navigation.

### Requirement: Empty Backend Selection Publishes A Complete Owner

ACP Chat MUST atomically select a complete local conversation owner when switching to a backend with no selectable unarchived conversation.

#### Scenario: Empty backend is selected

- **WHEN** the user selects a valid backend with no selectable unarchived conversation
- **THEN** the session manager MUST reuse an existing empty local placeholder or create one idle local placeholder
- **AND** it MUST publish the target backend and non-empty conversation id together
- **AND** it MUST NOT publish an intermediate active scope with an empty conversation id.

#### Scenario: Empty backend is selected repeatedly

- **WHEN** the user repeatedly selects the same backend before its placeholder is used
- **THEN** the same placeholder MUST remain selected
- **AND** no adapter connection or remote ACP session MUST be started.

#### Scenario: Invalid backend is selected

- **WHEN** the requested backend id is not a valid configured ACP backend
- **THEN** backend selection MUST fail
- **AND** the previously selected owner MUST remain unchanged.
