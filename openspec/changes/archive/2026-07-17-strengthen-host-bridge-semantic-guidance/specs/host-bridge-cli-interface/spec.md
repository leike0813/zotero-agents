## ADDED Requirements

### Requirement: CLI SHALL publish a complete Agent Surface v2

The CLI SHALL expose a `host-bridge.agent-surface.v2` descriptor whose leaf commands exactly match the commands accepted by the Rust Clap model and whose behavior facts are bound to canonical Host Bridge backend capabilities.

#### Scenario: Generator resolves command inventory
- **WHEN** the Agent Surface is generated
- **THEN** every accepted leaf command SHALL have exactly one descriptor entry
- **AND** missing, duplicate, or orphan command bindings SHALL fail generation.

#### Scenario: Agent inspects a command contract
- **WHEN** an agent describes a canonical command
- **THEN** the descriptor SHALL provide its argv and request/result schema, command family, backend target, approval, danger, state-change and retry behavior, consumed and returned typed handles, evidence requirements, and safe follow-up actions.

#### Scenario: Agent compares CLI identity
- **WHEN** an agent runs `zotero-bridge surface identity --json`
- **THEN** the result SHALL use `host-bridge.surface-identity.v2`
- **AND** it SHALL identify `zotero-bridge.cli.v2`, build fingerprint, and command catalog checksum without requiring a Zotero connection.

### Requirement: CLI SHALL provide intent-oriented surface discovery

Surface discovery SHALL compose generated command facts with family defaults and sparse command semantic supplements.

#### Scenario: Agent searches an ordinary task intent
- **WHEN** an agent runs `surface search --intent <intent> --json`
- **THEN** the CLI SHALL return no more than ten ranked matches by default
- **AND** each match SHALL include the reason it matched.

#### Scenario: Agent opts into diagnostic commands
- **WHEN** an agent searches without `--include-debug`
- **THEN** raw and debug commands SHALL be excluded from recommendations
- **AND** an exact `surface describe` SHALL still describe those commands.

#### Scenario: Agent changes the result bound
- **WHEN** an agent supplies `--limit <n>`
- **THEN** search SHALL return at most the requested positive bounded number of matches.

### Requirement: Agent Surface schemas SHALL describe stable observable contracts

Public command entries SHALL use the narrowest stable request and result schemas supported by their CLI and backend contracts instead of one global catch-all object schema.

#### Scenario: Command accepts structured input
- **WHEN** a command accepts named arguments, JSON input, pagination, or file output
- **THEN** its descriptor SHALL identify those stable fields and constraints
- **AND** SHALL NOT represent every command with an unconstrained object schema.

#### Scenario: Command consumes or returns a handle
- **WHEN** backend behavior consumes or returns a workflow, skill, agent request, permission, file, or product handle
- **THEN** the descriptor SHALL name the typed handle and whether failure can occur after consumption or state change.

### Requirement: CLI bundle README SHALL select the integration surface

The CLI bundle repository README SHALL explain when to choose low-level installation and integration, how to verify the exact offline command identity, and where bounded task or resident behavior belongs.

#### Scenario: User or agent opens the CLI bundle repository
- **WHEN** the repository README is the first document read
- **THEN** it SHALL route command details to the wrapper skill and progressive Agent Surface discovery
- **AND** SHALL distinguish the Library Agent bounded task surface from the Librarian resident surface.

### Requirement: Every CLI leaf command SHALL have an actionable operating contract

Each public leaf command SHALL resolve to exactly one domain-owned operation supplement and one rendered command-specific decision record in addition to generated CLI and backend facts.

#### Scenario: Agent reads a generated command card
- **WHEN** an agent opens the reference for a command
- **THEN** it SHALL explain backend source and freshness, when to use and avoid the command, the nearest alternatives, invocation and decoded payload fields, result evidence, pagination or file delivery, approval and effects, typed handles, and safe recovery
- **AND** it SHALL include a valid example or an explicit reason no payload example is needed.

#### Scenario: Semantic coverage is checked
- **WHEN** a command has only inherited family guidance, an orphan semantic record, an invalid example, or an impossible recovery command
- **THEN** content validation SHALL fail.

### Requirement: Agent Surface v2 SHALL separate control dimensions

Agent Surface v2 SHALL represent invocation schema, exact property-to-argv bindings, decoded payload schema, result data schema, effects, staged approval, handle transitions, and preconditioned recovery as distinct fields.

#### Scenario: Invocation contains options and positional values
- **WHEN** a command property maps to an option or positional CLI argument
- **THEN** the descriptor SHALL identify the literal option token or positional index and value name
- **AND** generated examples SHALL use that binding rather than deriving a flag from the property name.

#### Scenario: Result may use remote file delivery
- **WHEN** a command can return local or registered remote-file output
- **THEN** its result schema SHALL identify delivery mode, bundle metadata, download command, and unpack hint fields without treating a local path and `fileId` as interchangeable.

#### Scenario: Recovery follows a typed handle
- **WHEN** a recovery action names a next command
- **THEN** the descriptor SHALL identify the handles required by that action
- **AND** generation SHALL fail when the current command cannot make those handles available.
