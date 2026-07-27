# synthesis-host-bridge-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for synthesis host bridge operations, specifying how Workbench reads and reacts to client-side state changes.
## Requirements
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

Normal and debug Host Bridge calls SHALL use lazy cached default-client acquisition. They SHALL NOT use the Sync-specific fresh-client path, add service invalidation, or resolve a legacy service. Test injection SHALL resolve a client rather than a service.

#### Scenario: Default Host capability executes
- **WHEN** no test client resolver is configured
- **THEN** Host Bridge SHALL obtain the cached native production client
- **AND** unavailable native state SHALL fail closed without a legacy fallback

### Requirement: Complete-service access is confined to legacy composition

The retained legacy service MAY remain directly accessible only inside isolated oracle tests until R9b deletion. No production source SHALL resolve or import the complete legacy service; Host Bridge and MCP SHALL continue to use the grouped native `SynthesisClient`.

#### Scenario: Static boundary is inspected
- **WHEN** the service-boundary checker runs after cutover
- **THEN** the production direct-consumer count for the legacy service is zero
- **AND** isolated oracle fixtures are the only allowed legacy direct consumers

