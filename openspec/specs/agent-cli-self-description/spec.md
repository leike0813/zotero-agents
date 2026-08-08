# agent-cli-self-description Specification

## Purpose

Define the governed self-description contract for published CLI commands, structured inputs, and context-dependent examples.

## Requirements

### Requirement: Published CLI surfaces SHALL describe every public command and option
Each published CLI package SHALL expose a versioned machine-readable descriptor whose command inventory exactly matches its parser, whose inherited global and local arguments preserve complete parser metadata, and whose structured inputs, examples, payloads, and command results are governed by strict schemas from one command-contract source.

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
