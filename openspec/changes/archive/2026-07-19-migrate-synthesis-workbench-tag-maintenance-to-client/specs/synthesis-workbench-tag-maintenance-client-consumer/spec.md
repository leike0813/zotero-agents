## ADDED Requirements

### Requirement: Tag maintenance capability is environment-neutral
The system SHALL expose Tag Vocabulary validation, projection rebuild, and regulator export through `SynthesisClient.tags` using only JSON-safe results and without Workbench, clipboard, confirmation, streaming, or progress callback types.

#### Scenario: Consumer imports the Tag capability
- **WHEN** a consumer imports the public Synthesis contracts package
- **THEN** it can access the dedicated Tag client and existing Tag DTOs without importing the legacy service or workflow implementation

#### Scenario: Maintenance methods have bounded contracts
- **WHEN** a consumer validates the current vocabulary, rebuilds the Tag projection, or exports regulator tags
- **THEN** the client accepts no Workbench-specific arguments and returns respectively an opaque JSON value, an opaque JSON object, or a string array

### Requirement: In-process Tag maintenance adapter normalizes the legacy boundary
The in-process adapter SHALL invoke narrow optional legacy ports, normalize all successful results to their public JSON-safe contracts, and use stable client error categories.

#### Scenario: Ports return valid results
- **WHEN** validation, rebuild, or export returns a value matching its public result contract
- **THEN** the adapter returns the normalized result without exposing legacy prototypes or runtime objects

#### Scenario: A port is unavailable
- **WHEN** the requested legacy port is not composed
- **THEN** the adapter rejects with the `unavailable` client error code

#### Scenario: A port fails
- **WHEN** a port throws a known client error, a storage-busy failure, an ordinary exception, or returns an invalid result
- **THEN** the adapter preserves known client and storage-busy categories and maps ordinary or invalid-result failures to `internal`

### Requirement: Workbench routes Tag maintenance through the client
The Workbench SHALL lazily resolve the default Synthesis client inside each existing single-flight closure and SHALL invoke the three selected commands through `client.tags` without directly resolving the legacy service.

#### Scenario: Vocabulary validation runs
- **WHEN** the Workbench executes `validateTagVocabulary`
- **THEN** it uses empty single-flight arguments, starts immediately without confirmation or diagnostic transformation, and preserves Home-only invalidation

#### Scenario: Tag projection rebuild runs
- **WHEN** the user confirms `rebuildTagVocabularyIndex`
- **THEN** the Workbench calls the no-argument Tag client method with empty single-flight arguments, uses deferred start, preserves Tags invalidation, and supplies no progress callback

#### Scenario: Regulator export runs
- **WHEN** the Workbench executes `exportTagVocabulary`
- **THEN** it calls the Tag client export method immediately and writes the returned tags to the host clipboard as newline-separated text with one trailing newline while preserving Home-only invalidation

### Requirement: Adjacent Tag and integration behavior remains unchanged
The migration SHALL NOT change staged suggestions, imports, vocabulary editing, bootstrap, audits, domain logic, public service inventory, Host Bridge, MCP, or workflow-host ownership.

#### Scenario: Boundary inventory is checked
- **WHEN** repository boundary checks run after the migration
- **THEN** the Synthesis service still exposes 125 public methods and has four approved direct consumers
