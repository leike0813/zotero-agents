## ADDED Requirements

### Requirement: Rust CLI exposes context commands

The CLI SHALL expose canonical `context` commands for Host Bridge context reads
and restricted Zotero object navigation while preserving single JSON stdout.

#### Scenario: Agent reads context

- **WHEN** a user or agent runs `zotero-bridge context current`
- **THEN** the CLI SHALL call `GET /bridge/v1/context/current`.

#### Scenario: Agent reads selection

- **WHEN** a user or agent runs `zotero-bridge context selection get`
- **THEN** the CLI SHALL call `GET /bridge/v1/context/selection`.

#### Scenario: Agent opens a Zotero target

- **WHEN** a user or agent runs a `context ... open` command with Zotero object
  handles
- **THEN** the CLI SHALL post an explicit JSON body to the matching context
  navigation endpoint
- **AND** it SHALL NOT use raw capability call, arbitrary URI opening, or eval.
