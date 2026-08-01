# synthesis-client-contracts Specification

## Purpose
Defines the Synthesis clients contract, specifying the data exchange format, validation rules, and integration boundaries.

## Requirements

### Requirement: Contracts are environment-neutral and independently checked

The Synthesis contracts package SHALL compile without Node, DOM, Zotero, plugin toolkit, repository, filesystem, or transport implementation dependencies.

#### Scenario: Forbidden dependency is introduced
- **WHEN** contract source imports an environment-specific or implementation module
- **THEN** the contract boundary check SHALL fail

#### Scenario: Plugin build is validated
- **WHEN** the project typecheck or production build runs
- **THEN** the contracts package SHALL be independently typechecked as part of that gate

### Requirement: Client capabilities are grouped and use-case shaped

The `SynthesisClient` SHALL expose bounded domain capabilities and SHALL NOT reproduce the legacy flat service object.

#### Scenario: Workflow Topic options are requested
- **WHEN** a caller requests workflow Topic options
- **THEN** it SHALL call `client.topics.listWorkflowOptions` with the bounded filter request
- **AND** it SHALL receive the package-owned JSON-safe option result

#### Scenario: New use case is migrated
- **WHEN** a later consumer needs another Synthesis use case
- **THEN** the contract SHALL add it to the relevant capability group rather than expose the full legacy service

### Requirement: Client errors have stable control-flow codes

Client implementations SHALL reject failures as `SynthesisClientError` values with stable codes and JSON-safe diagnostic details, while human-readable messages remain non-authoritative.

#### Scenario: Legacy implementation throws an ordinary error
- **WHEN** the in-process adapter receives a non-client exception
- **THEN** it SHALL reject with the stable `internal` code
- **AND** diagnostic details SHALL remain JSON-safe

#### Scenario: Client error crosses an adapter
- **WHEN** the legacy port throws an existing `SynthesisClientError`
- **THEN** the adapter SHALL preserve its stable code and structured details

### Requirement: Legacy composition is isolated behind a narrow port

The migration-time in-process client SHALL depend on narrow legacy capability ports, and only its default composition module SHALL resolve the full default Synthesis service.

#### Scenario: Workflow option consumer resolves its dependency
- **WHEN** workflow parameter options need Topic choices without an injected client
- **THEN** the consumer SHALL resolve the default `SynthesisClient`
- **AND** it SHALL NOT import the legacy Synthesis service

#### Scenario: Direct legacy consumer grows
- **WHEN** production code adds another import or resolver for the full legacy service outside the recorded composition allowlist
- **THEN** the service boundary check SHALL fail

### Requirement: Production behavior remains in-process during foundation migration

The default client SHALL delegate to the current in-process service and SHALL NOT change Synthesis DB, canonical file, mirror, or Zotero ownership.

#### Scenario: Default Topic option query executes
- **WHEN** the plugin uses the default Synthesis client
- **THEN** the query SHALL execute against the current in-process service through the adapter
- **AND** no remote runtime SHALL be required

### Requirement: Observation contracts SHALL be strict and payload-free

The v2 rebuilder SHALL reject unknown fields, free error text, raw locators,
paths, credentials, and identifiers outside closed identity/fact/metric keys.
Zero-valued allowlisted metrics and facts SHALL be preserved.

#### Scenario: Unknown detail is supplied
- **WHEN** an event contains a title or arbitrary detail key
- **THEN** rebuilding fails closed
