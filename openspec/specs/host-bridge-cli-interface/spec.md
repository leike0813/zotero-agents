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

### Requirement: CLI SHALL keep global controls and leaf payload bindings distinct
The CLI SHALL expose only `--endpoint`, `--profile`, `--operation-id`, and `--schema` as global controls. `--query`, `--input`, `--json`, and output-destination options SHALL remain leaf-local and SHALL appear only when the selected command descriptor declares them. Every success and structured failure SHALL write exactly one JSON envelope without requiring a formatting flag.

#### Scenario: Ordinary command does not accept a surface-local JSON flag
- **WHEN** an agent invokes `zotero-bridge bridge status --json`
- **THEN** the CLI returns a structured nonzero usage error
- **AND** plain `zotero-bridge bridge status` remains the canonical JSON-envelope invocation.

#### Scenario: Query and input bindings use the same transport for different contracts
- **WHEN** a leaf declares `--query`
- **THEN** the canonical invocation uses it for the read selector, filter, or pagination object
- **AND** a leaf that instead declares `--input` uses that token for its command-owned payload
- **AND** neither token is inferred for a command whose descriptor does not declare it.

#### Scenario: Output destination is command-owned
- **WHEN** an agent needs delivered bytes or a local artifact
- **THEN** it uses only the destination option declared by that leaf
- **AND** no generic output flag is inferred from another file, Product, or workflow command.

### Requirement: Semantic CLI reads SHALL expose their owned continuation controls
Every semantic CLI command mapped to a cursor or offset boundary SHALL expose the
corresponding `--cursor`/`--limit` or `--offset`/`--max-chars` arguments and pass them
to its owned endpoint or capability. `call` SHALL NOT be documented or accepted as a
way to bypass the semantic command's output boundary.

#### Scenario: Agent follows a cursor page
- **WHEN** a semantic command returns a non-empty `nextCursor`
- **THEN** the same command accepts that value through `--cursor`
- **AND** preserves the original filters while requesting the next page.

### Requirement: Surface search SHALL return compact matches
`surface search` SHALL return only command identity, summary, category, danger, and
match reasons. It SHALL default to 10 matches and reject or clamp limits above 20.

#### Scenario: Agent searches by intent
- **WHEN** a search matches a command
- **THEN** the result does not embed the complete command descriptor
- **AND** directs full contract inspection to `surface describe`.
