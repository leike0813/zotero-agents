## MODIFIED Requirements

### Requirement: CLI SHALL publish a mechanism-only Agent Surface v4
The offline `surface` command family SHALL publish `host-bridge.agent-surface.v5` under CLI identity `zotero-bridge.cli.v4`, with global options and exact command argv, complete parser argument metadata, raw structured-input schemas, classified examples, composed payload schemas, strict result schemas, effects, approval requirements, typed handles, recovery rules, targets, operational summaries, and operational aliases. It SHALL NOT contain research-task guidance or a built-in workflow catalog.

#### Scenario: Generic prose does not change CLI identity
- **WHEN** only Generic task guidance or built-in workflow descriptions change
- **THEN** the embedded Agent Surface bytes and CLI build fingerprint remain unchanged.

#### Scenario: Descriptor loses parser or contract facts
- **WHEN** an argument, schema-bearing input, example, or result contract is missing, duplicated, orphaned, or replaced by a generic empty shell
- **THEN** descriptor generation and release validation fail.

### Requirement: Minimum Skill SHALL be the complete CLI operating contract
The `zotero-bridge-cli` `SKILL.md` SHALL contain the complete executable CLI loop, installation/profile selection, connection diagnosis, invocation, pagination, files, approvals, handles, workflow control planes, output evidence, and failure recovery. It SHALL directly link the source-generated command catalog, which SHALL directly link one exhaustive card per canonical leaf command. It SHALL NOT select research tasks for the agent.

#### Scenario: Minimum stays task-neutral
- **WHEN** the Minimum Skill is rendered
- **THEN** exact commands are complete and no query, acquisition, analysis, synthesis, or curation workflow policy is embedded.

#### Scenario: Generated command card is complete
- **WHEN** one v5 command descriptor is rendered into its offline reference
- **THEN** global and local argv metadata, invocation schema, every structured input schema, composed payload schema, result schema, examples, pagination, effects, approval scope, handles, recovery, targets, aliases, and search visibility remain available.

## ADDED Requirements

### Requirement: CLI SHALL expose offline structured-input schemas
The CLI SHALL accept global `--schema` for canonical leaf commands and return a versioned `zotero-bridge.command-input-schemas.v1` package inside the existing success envelope. Schema mode SHALL identify the leaf without requiring ordinary command values and SHALL NOT load a profile, read Bridge configuration, or make a network request.

#### Scenario: Schema flag follows the leaf command
- **WHEN** an agent invokes `zotero-bridge <leaf-command> --schema` without ordinary required values
- **THEN** stdout contains exactly one successful JSON envelope
- **AND** `data.command` is the canonical leaf command
- **AND** every structured input is keyed by argument id with token, requirement metadata, raw schema object, and examples.

#### Scenario: Schema flag precedes the leaf command
- **WHEN** an agent invokes `zotero-bridge --schema <leaf-command>`
- **THEN** it receives the same schema package as the trailing form.

#### Scenario: Leaf has several structured inputs
- **WHEN** the selected command accepts multiple JSON inputs
- **THEN** the package returns each input separately without stringifying its schema.

#### Scenario: Leaf has no structured input
- **WHEN** the selected leaf has no registered structured JSON input
- **THEN** the CLI returns a stable nonzero `command_input_schema_unavailable` error
- **AND** safe next guidance points to command help or `surface describe`.

#### Scenario: Path is not a canonical leaf
- **WHEN** `--schema` resolves only to a command group or cannot resolve a command path
- **THEN** the CLI returns a stable structured nonzero usage error.

### Requirement: CLI help SHALL reuse governed examples
Every schema-bearing argument SHALL expose at least one minimal, parseable example from the command-contract registry in leaf-command long help. Help SHALL remain human-readable and SHALL direct agents to `--schema` for complete raw schemas.

#### Scenario: Agent reads leaf help
- **WHEN** an agent requests help for a command with structured inputs
- **THEN** help lists inherited global and local parameters, possible values, key input guidance, examples, and prerequisites
- **AND** it does not embed a single-line serialization of the complete raw schema.
