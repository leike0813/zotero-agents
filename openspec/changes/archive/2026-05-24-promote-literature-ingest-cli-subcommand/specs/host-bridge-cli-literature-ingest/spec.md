## ADDED Requirements

### Requirement: Literature ingest has a first-class CLI command

The `zotero-bridge` CLI SHALL expose permission-gated literature ingest through
a top-level `literature ingest` command.

#### Scenario: Agent discovers literature commands

- **WHEN** a user or agent runs top-level CLI help
- **THEN** the help SHALL list `literature`.

#### Scenario: Agent discovers ingest command

- **WHEN** a user or agent runs `zotero-bridge literature --help`
- **THEN** the help SHALL list `ingest`.

### Requirement: Literature ingest preserves JSON input semantics

The `literature ingest` command SHALL accept `--input <JSON_OR_FILE>` using the
same parsing rules as raw `call --input`.

#### Scenario: Input payload is provided

- **WHEN** `zotero-bridge literature ingest --input <payload>` is invoked
- **THEN** the CLI SHALL parse inline JSON, `@file`, an existing file path, or
  `-` using the existing JSON input parser.

### Requirement: Literature ingest maps to canonical mutation operation

The CLI SHALL execute literature ingest by calling the Host Bridge
`mutation.execute` capability with `operation: "literature.ingest"`.

#### Scenario: Ingest command is called

- **WHEN** `zotero-bridge literature ingest --input @payload.json` is invoked
- **THEN** the CLI SHALL submit the parsed `papers` and optional `collection`
  inside a mutation execute payload
- **AND** the mutation operation SHALL be `literature.ingest`.

### Requirement: Literature ingest guidance avoids diagnostic raw calls

Agent-facing guidance SHALL recommend `zotero-bridge literature ingest` for
normal literature ingest work.

#### Scenario: Agent reads Host Bridge CLI instructions

- **WHEN** instructions describe how to ingest searched literature
- **THEN** they SHALL recommend `zotero-bridge literature ingest --input ...`
- **AND** they SHALL NOT recommend `call mutation.execute` as the normal path.
