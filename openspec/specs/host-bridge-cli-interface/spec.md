# host-bridge-cli-interface Specification

## Purpose
TBD - created by syncing changes upgrade-host-bridge-cli-machine-readable-contracts and unify-host-bridge-cli-contracts-and-parameter-errors. Update Purpose after archive.

## Requirements

### Requirement: CLI SHALL publish a mechanism-only Agent Surface v5
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

### Requirement: CLI SHALL execute remote commands through one canonical contract
Zotero Bridge CLI 0.5.0 SHALL derive every remote target, structured payload binding, capability input Schema, command result Schema, effect, approval fact, handle transition, and recovery rule from the executable capability and command contracts.

#### Scenario: Remote command executes
- **WHEN** a canonical remote leaf command is invoked
- **THEN** the CLI SHALL resolve its target and binding from the command contract
- **AND** compose constants, field mappings, and closed transforms from that contract rather than a command handler
- **AND** validate the composed payload against the target capability before network I/O
- **AND** validate the returned capability and command results before stdout.

#### Scenario: Command implementation bypasses the executor
- **WHEN** a command implementation calls low-level remote transport or declares a capability target outside the contract executor
- **THEN** architecture validation SHALL fail.

#### Scenario: Composition references parser input
- **WHEN** a fixed capability command declares a base source or field mapping
- **THEN** every referenced source SHALL resolve to an argument ID in the real Clap leaf
- **AND** unknown sources, duplicate target fields, undeclared transforms, and missing required values SHALL fail before network I/O.

#### Scenario: Semantic command specializes a generic capability
- **WHEN** a mutation or readiness command fixes an operation discriminator, check set, or field mapping
- **THEN** the specialization SHALL exist in executable command-contract composition
- **AND** `--schema`, `surface describe`, generated command cards, and runtime payload construction SHALL project that same specialization.

#### Scenario: Item search uses the canonical selector
- **WHEN** `library item search --query` receives `{"query":"graph"}`
- **THEN** the payload SHALL validate and pass through without field translation
- **AND** `{"text":"graph"}` SHALL fail as an undeclared field.

### Requirement: CLI SHALL return structured parameter failures
The CLI SHALL distinguish argv, JSON source, JSON syntax, command input, capability input, payload composition, remote result, and local result failures with stable error codes and redacted violation details.

#### Scenario: Argument parser rejects an invocation
- **WHEN** the invocation has a missing argument, unknown argument, conflict, invalid value, or missing subcommand
- **THEN** the CLI SHALL return the corresponding stable usage code rather than only `cli_usage_error`
- **AND** include the command and safe argument context when available.

#### Scenario: Structured input violates a Schema
- **WHEN** parsed JSON has missing, mistyped, or undeclared properties
- **THEN** the CLI SHALL return sorted structured violations with JSON paths and expected constraints
- **AND** SHALL NOT expose secrets or the complete raw payload.

### Requirement: Broker file routes SHALL use the Host Bridge v2 namespace
Broker-issued file upload and download operations SHALL use `/bridge/v2` and retain their opaque-handle, authorization, integrity, and path-redaction requirements.

#### Scenario: Authenticated v2 client downloads a file
- **WHEN** a v2 client downloads a valid broker-issued file handle
- **THEN** Host Bridge SHALL return the authorized bytes under the existing integrity and redaction rules.

#### Scenario: Client uses the removed v1 route
- **WHEN** a client requests the corresponding `/bridge/v1/files` route
- **THEN** Host Bridge SHALL NOT serve it as a supported v2 file operation.

### Requirement: CLI workflow commands expose resource bindings
The canonical `workflow validate` and `workflow submit` commands SHALL expose repeatable input-resource bindings in the form `<slot>=<fileId>` and output-resource delivery bindings in the form `<slot>=bridge-download`. Their offline schemas, help, command cards, payload composition, and result schemas SHALL use the same field names and SHALL not expose file-picker or client-path parameters.

#### Scenario: CLI binds an uploaded input
- **WHEN** an agent invokes `workflow submit --input-resource source=file-123`
- **THEN** the CLI SHALL send `resourceBindings.inputs.source.fileIds = ["file-123"]`
- **AND** it SHALL not send the local path used by the preceding upload command

#### Scenario: Multiple files bind to one slot
- **WHEN** an agent repeats `--input-resource notes=file-1 --input-resource notes=file-2`
- **THEN** the CLI SHALL preserve both opaque handles in binding order

### Requirement: CLI exposes resource delivery results
The CLI workflow result contract SHALL expose resource output descriptors and safe continuation guidance through the existing `file download` command. It SHALL not print Host-local paths or silently open GUI interaction.

#### Scenario: Workflow returns a downloadable output
- **WHEN** a remote workflow completes with an output resource
- **THEN** the CLI SHALL return its `fileId`, integrity metadata, expiry, and download command in the structured result

#### Scenario: Workflow requires interaction
- **WHEN** a non-interactive workflow would require a picker, editor, or confirmation dialog
- **THEN** the CLI SHALL return a stable interaction-required error and a safe next action

### Requirement: CLI SHALL expose direct paper and Topic bundle commands

The CLI SHALL expose `library items export-research-bundle` with canonical item-ref array input and `synthesis topic export-research-bundle` with one or more Topic ids. Each leaf SHALL declare exact argv bindings, strict input and result schemas, file output boundary, read-only Zotero effect, local filesystem effect, no-approval status, typed delivery, completion evidence, intent aliases, and recovery commands in the executable command contract.

#### Scenario: Paper bundle schema is requested
- **WHEN** an agent invokes `zotero-bridge library items export-research-bundle --schema`
- **THEN** schema mode exposes the item-ref array, connection-dependent output directory, bounds, and discriminated delivery result without loading a profile or contacting Zotero.

#### Scenario: Topic command uses repeated ids
- **WHEN** an agent invokes `zotero-bridge synthesis topic export-research-bundle --topic-id <id>` one or more times
- **THEN** the CLI preserves first-occurrence order, rejects an empty selection, and sends the normalized Topic id array to the canonical capability.

#### Scenario: Connection mode and output directory disagree
- **WHEN** local mode omits `--output-dir` or remote mode supplies it
- **THEN** the CLI fails before capability execution with a structured usage error.
