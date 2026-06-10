## ADDED Requirements

### Requirement: ACP Chat exposes Host Bridge guidance through wrapper skill

ACP Chat SHALL keep Host Bridge runtime access available while avoiding direct
Host Bridge prompt injection.

#### Scenario: Chat materializes wrapper skill for project skill roots

- **GIVEN** an ACP Chat backend resolves to one or more project skill roots
- **WHEN** the ACP Chat adapter is created
- **THEN** the chat workspace SHALL receive the `zotero-bridge-cli` wrapper
  skill in those skill roots
- **AND** user chat prompts sent to the ACP adapter SHALL remain the original
  user message without appended Host Bridge guidance.

#### Scenario: Chat backend has no project skill roots

- **GIVEN** an ACP Chat backend resolves to no project skill roots
- **WHEN** the ACP Chat adapter is created
- **THEN** the system SHALL record a diagnostic that the Host Bridge wrapper
  skill was not materialized
- **AND** it SHALL NOT fall back to direct Host Bridge prompt injection.
