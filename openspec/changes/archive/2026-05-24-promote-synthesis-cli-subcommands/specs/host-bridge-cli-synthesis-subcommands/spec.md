## ADDED Requirements

### Requirement: Synthesis capabilities have first-class CLI subcommands

The `zotero-bridge` CLI SHALL expose registered Synthesis host capabilities
through a top-level `synthesis` command.

#### Scenario: Agent discovers CLI commands

- **WHEN** a user or agent runs top-level CLI help
- **THEN** the help SHALL list `synthesis` alongside the other semantic
  commands.

#### Scenario: Agent discovers Synthesis commands

- **WHEN** a user or agent runs `zotero-bridge synthesis --help`
- **THEN** the help SHALL list semantic kebab-case subcommands for each
  supported Synthesis capability.

### Requirement: Synthesis subcommands preserve JSON input semantics

Each Synthesis subcommand SHALL accept optional `--input <JSON_OR_FILE>` using
the same parsing rules as raw `call --input`.

#### Scenario: Input is omitted

- **WHEN** a Synthesis subcommand is invoked without `--input`
- **THEN** the Host Bridge capability input SHALL be `{}`.

#### Scenario: Input is provided

- **WHEN** a Synthesis subcommand is invoked with inline JSON, `@file`, an
  existing file path, or `-`
- **THEN** the CLI SHALL parse the payload using the existing JSON input rules.

### Requirement: Synthesis subcommands map to stable capabilities

Each Synthesis subcommand SHALL call the corresponding `synthesis.*` Host Bridge
capability without changing the stdout JSON envelope or error model.

#### Scenario: Topic list command is called

- **WHEN** `zotero-bridge synthesis list-topics --input '{}'` is invoked
- **THEN** the CLI SHALL call `synthesis.list_topics`.

#### Scenario: Library and resolver commands are called

- **WHEN** the library index, resolver, citation metrics, or filtered artifact
  commands are invoked
- **THEN** the CLI SHALL call the matching `synthesis.*` capability.

### Requirement: Raw call remains diagnostic

The CLI SHALL keep `call <capability>` available for advanced diagnostics while
normal Synthesis guidance uses `synthesis <subcommand>`.

#### Scenario: Documentation describes Synthesis access

- **WHEN** agent-facing Host Bridge CLI instructions describe Synthesis access
- **THEN** they SHALL recommend `zotero-bridge synthesis <subcommand>`
- **AND** they SHALL NOT recommend `zotero-bridge call synthesis.*` as the
  normal path.
