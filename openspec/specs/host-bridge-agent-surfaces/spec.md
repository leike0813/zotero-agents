# host-bridge-agent-surfaces Specification

## Purpose

Define how Host Bridge agent surfaces preserve complete, reachable, intent-oriented command guidance across governed references.

## Requirements

### Requirement: Published CLI surfaces SHALL describe every public command and option
Each published CLI package SHALL expose a versioned machine-readable descriptor whose command inventory exactly matches its parser, whose inherited global and local arguments preserve complete parser metadata, and whose structured inputs, examples, payloads, and command results are governed by strict schemas from one command-contract source. The descriptor SHALL be built from the real Clap command tree and executable capability and command contracts.

#### Scenario: Surface is generated
- **WHEN** a CLI or helper surface is generated
- **THEN** every public leaf command, local option, positional, and global option has exactly one descriptor entry
- **AND** argument ids, tokens, value arity, possible values, repeatability, environment variables, requirements, conflicts, and help remain available
- **AND** missing, duplicate, or orphan parser or command-contract bindings fail generation.

#### Scenario: Structured input is described
- **WHEN** a command accepts one or more structured JSON inputs
- **THEN** each input has a raw JSON Schema object and at least one classified example
- **AND** the command descriptor exposes the composed payload schema and a strict result schema without generic empty capability or data shells.

#### Scenario: Example needs live context
- **WHEN** a valid shape requires a real Zotero id, workflow id, provider state, run handle, or other live prerequisite
- **THEN** the example is marked `shape-only` and lists its prerequisites
- **AND** it is not presented as directly executable.

### Requirement: Governed references SHALL be comprehensive and directly reachable
Every non-generated instruction file under a governed Skill's `references/` directory SHALL be directly linked from its `SKILL.md`. Generated per-command references MAY instead be directly linked from the generated command catalog when `SKILL.md` directly links that catalog. References SHALL cover coherent decision domains rather than fragmented reminders, and execution-critical constraints SHALL also appear in `SKILL.md`.

#### Scenario: Non-generated orphan reference blocks publication
- **WHEN** a governed non-generated reference is not directly linked from `SKILL.md`
- **THEN** deterministic Host Bridge content validation fails before materialization.

#### Scenario: Generated command card is unreachable
- **WHEN** a generated command card is missing from the directly linked command catalog, linked more than once, or linked by an incorrect path
- **THEN** deterministic Host Bridge content validation fails before materialization.

#### Scenario: Parameter contract rejects input
- **WHEN** a generated card describes a schema-bearing input
- **THEN** its failure and recovery section SHALL identify the stable structured error category and direct the agent to `--schema` or `surface describe`
- **AND** all unaffected instructions SHALL retain their baseline meaning and depth.

### Requirement: Minimum command references SHALL be partitioned by canonical leaf command
The Minimum Skill SHALL publish one exhaustive generated Markdown command card for every canonical leaf command. Each command SHALL map to exactly one deterministic path under `references/commands/`, and each card SHALL be independently sufficient to inspect that command's complete argv, invocation, structured-input, payload, result, effect, approval, handle, recovery, target, alias, and intent contract.

#### Scenario: Agent needs one command
- **WHEN** an agent selects a canonical command from the catalog
- **THEN** the catalog links exactly one card for that command
- **AND** the agent does not need to load unrelated commands to inspect the complete contract.

#### Scenario: Command inventory changes
- **WHEN** a canonical leaf command is added, removed, renamed, or remapped
- **THEN** rendering fails until card paths, catalog links, parser inventory, and command-contract registry form one duplicate-free and orphan-free set.

### Requirement: Minimum-core SHALL provide intent-first command discovery
The minimum-core surface SHALL publish a generated command catalog that lets an agent discover canonical commands from Zotero task intent before it knows command names, while keeping detailed invocation contracts in directly linked per-command cards.

#### Scenario: Agent starts from an ordinary Zotero request
- **WHEN** an agent needs to act on a Zotero library but does not know a canonical command
- **THEN** the catalog maps the task family and natural-language cues to candidate commands and the correct individual command card.

#### Scenario: Catalog is rendered from the command contract
- **WHEN** the CLI Agent Surface descriptor changes
- **THEN** every canonical command appears exactly once in the generated catalog
- **AND** every catalog entry links exactly one generated card containing that command only.

### Requirement: Minimum Skill SHALL explain invocation-control semantics
The minimum-core `SKILL.md` SHALL explain the purpose and timing of every true global option, the fixed JSON-envelope output boundary, the distinction between leaf-local `--query` and `--input`, and command-owned output destinations. Generated command cards SHALL state whether `--schema` can return a structured-input package for that leaf.

#### Scenario: Agent constructs a leaf invocation
- **WHEN** an agent moves from command discovery to argv construction
- **THEN** it can distinguish connection and idempotency controls from leaf payload bindings
- **AND** it does not add `--json`, `--query`, `--input`, `--schema`, or an output destination unless the current command contract permits that use.

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

### Requirement: Command-card migration SHALL preserve semantic depth
Replacing aggregate command references with per-command cards SHALL preserve every existing authorized command semantic unit from baseline commit `71da2eb325e946291b901d778b20ceb3c5db368f`. Only the eight declared aggregate container files MAY be removed, and their still-valid command semantics SHALL be mapped into generated cards.

#### Scenario: Command cards are validated against the fixed baseline
- **WHEN** the Minimum package is rendered
- **THEN** validation reports `unmapped = 0`, `downgraded = 0`, `unauthorized dropped = 0`, and `intra-package duplicate = 0`
- **AND** command coverage is `125/125`
- **AND** aggregate-to-card substantive instruction lines are at least 2092
- **AND** normalized prose characters are at least 95 percent of 241086.

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

### Requirement: CLI Agent Surface SHALL disclose provider-profile selection gates
The generated mechanism surface, command cards, and `zotero-bridge-cli` Skill SHALL state the provider-profile resolution precedence, the special handling of `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`, the explicit empty-object override, and the no-environment user-confirmation gate. They SHALL instruct the Agent to present the exact candidate/profile fields and wait for user confirmation when required, and SHALL prohibit guessing or shape-copying a provider, model, or reasoning value.

#### Scenario: Agent uses an environment default
- **WHEN** the environment default is available and the Agent has no explicit profile argument
- **THEN** the published guidance directs the Agent to invoke describe/validate and submit using the environment-resolved profile without asking the user to reconfirm it
- **AND** it does not tell the Agent to synthesize another profile.

#### Scenario: Agent must confirm a non-environment candidate
- **WHEN** no environment default exists and discovery returns a Host-saved default or catalog candidate
- **THEN** the published guidance requires the Agent to show the candidate's backend/provider/model/reasoning fields and obtain a clear user confirmation before submit
- **AND** it distinguishes that confirmation from workflow approval and ACP permission approval.

#### Scenario: Agent cannot infer a profile
- **WHEN** no explicit profile or environment default exists and the user has not selected a profile
- **THEN** the Agent is instructed to ask the user which valid profile to use
- **AND** it MUST NOT choose by catalog order, backend popularity, or matching JSON shape.

### Requirement: CLI Agent Surface SHALL expose profile refresh and structured recovery
The public command contract SHALL include backend-scoped profile refresh, describe, validate, and submit relationships, including readiness diagnostics and stable recovery guidance for stale, missing, contradictory, or unavailable catalogs. Generated references SHALL preserve the existing agent-facing semantic depth and SHALL be materialized from governed sources.

#### Scenario: Agent repairs a stale catalog
- **WHEN** describe or validate reports a stale/non-ready catalog
- **THEN** the command surface directs the Agent to refresh that backend and re-run describe/validate before submission
- **AND** it does not recommend submitting the stale profile.

#### Scenario: Surface contract is incomplete
- **WHEN** a generated card omits profile confirmation, environment-default precedence, refresh, or structured error/recovery facts
- **THEN** surface validation fails and the release gate reports the missing semantic unit.

### Requirement: Plugin SHALL bundle the exact Host Bridge Skill closure

The generated minimum-core and Generic Host Bridge surfaces SHALL be materialized as one plugin-owned bundle containing exactly the seven Skills resolved by surface inheritance. The bundle SHALL contain a machine-readable manifest that binds the CLI version, build fingerprint, command-catalog checksum, surface identities, runner contracts, every file's safe relative path, byte length, SHA-256 digest, and one aggregate digest.

#### Scenario: Renderer produces the plugin bundle

- **WHEN** maintainers render Host Bridge agent-facing surfaces
- **THEN** the plugin bundle contains one manifest and exactly the seven resolved Skill trees
- **AND** the old generated Host Bridge Skill directories under the Content Package source root are absent

#### Scenario: Bundle inventory is not exact

- **WHEN** a generated bundle contains a missing, additional, duplicate, traversal, or digest-mismatched entry
- **THEN** validation fails before the plugin can be built or released

### Requirement: Surface relocation SHALL preserve semantic parity

Relocating generated Skills SHALL preserve every source instruction, direct reference, asset, runner contract, and externally published surface byte. Relative baseline checks SHALL map the new plugin bundle root to the fixed baseline's former generated root and SHALL report zero unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate semantic units.

#### Scenario: Relocated package is compared with baseline

- **WHEN** the materialized Skill validator compares the new bundle with the fixed pre-relocation commit
- **THEN** every governed file is compared against its former path
- **AND** the substantive-line, normalized-prose, reachability, and semantic-parity gates remain satisfied
