## ADDED Requirements

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
