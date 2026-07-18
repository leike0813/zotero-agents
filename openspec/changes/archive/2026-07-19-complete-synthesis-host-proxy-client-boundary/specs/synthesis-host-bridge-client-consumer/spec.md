## ADDED Requirements

### Requirement: Host Bridge uses domain-grouped Synthesis client capabilities
Every normal and debug Host Bridge Synthesis capability SHALL resolve a `SynthesisClient` and invoke the matching Topic, Graph, Reference, Artifact, Concept, Maintenance, Library Index, Workflow Review, or Debug method. Host Bridge and MCP production code SHALL NOT resolve or import the complete Synthesis service.

#### Scenario: Synthesis capability is called
- **WHEN** a caller invokes any of the twenty-three normal or eight debug Synthesis capabilities
- **THEN** Host Bridge SHALL route the call through the matching grouped client capability
- **AND** the existing capability name, input schema, approval requirement, and result envelope SHALL remain unchanged

### Requirement: Open Host requests cross a JSON-safe boundary
Alias-rich Host requests SHALL be rebuilt as JSON-safe objects before an optional legacy port is resolved. Unknown JSON-safe fields SHALL remain available to open raw APIs. Results SHALL be rebuilt as JSON objects. Missing ports, invalid requests or results, existing client errors, transient storage errors, and ordinary failures SHALL retain the common client error classification.

#### Scenario: Open request succeeds
- **WHEN** a Host capability supplies a JSON-safe object containing supported aliases and additional JSON-safe fields
- **THEN** the matching port SHALL receive a rebuilt object preserving those fields
- **AND** the client SHALL return a rebuilt JSON object

#### Scenario: Boundary input or result is invalid
- **WHEN** a direct client request is not a JSON-safe object or a port returns a non-object result
- **THEN** the client SHALL reject through the stable `invalid_request` or `internal` classification

### Requirement: Delivery context preserves local and remote file safety
Topic Context and filtered paper-artifact export SHALL accept `SynthesisDeliveryContext` separately from their request objects. Local delivery SHALL preserve current output-path and run-root behavior. Remote delivery SHALL avoid caller-provided local paths and return the current Host Bridge download bundle.

#### Scenario: Topic Context uses remote delivery
- **WHEN** a remote Host Bridge caller requests an explicit Topic Context view with an output path
- **THEN** the client call SHALL carry remote delivery mode outside the request JSON
- **AND** the caller-provided host path SHALL NOT be written or exposed

#### Scenario: Filtered artifacts use local delivery
- **WHEN** a local caller exports filtered paper artifacts
- **THEN** the existing ACP run-root validation and relative manifest paths SHALL remain in force

### Requirement: Host Bridge uses cached client composition
Normal and debug Host Bridge calls SHALL use lazy cached default-client acquisition. They SHALL NOT use the Sync-specific fresh-client path or add service invalidation. Test injection SHALL resolve a client rather than a service.

#### Scenario: Default Host capability executes
- **WHEN** no test client resolver is configured
- **THEN** Host Bridge SHALL obtain the cached default client
- **AND** the client port SHALL resolve the current default legacy service when invoked

### Requirement: Complete-service access is confined to legacy composition
The public Synthesis service SHALL retain 128 methods. The only production direct consumer SHALL be the legacy client composition root. The retained library-index capability SHALL be classified as a client capability rather than scheduled for removal.

#### Scenario: Static boundary is inspected
- **WHEN** the service-boundary checker runs
- **THEN** it SHALL report exactly 128 public methods and one direct consumer
- **AND** Host Bridge and MCP SHALL not appear in the direct-consumer list
