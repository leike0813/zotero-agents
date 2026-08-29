## ADDED Requirements

### Requirement: Workbench Topic Graph commands use a distinct client capability
The Synthesis client SHALL expose an independent Topic Graph capability for projection rebuild, edge acceptance, edge rejection, and review action. The Workbench SHALL lazily resolve the default client and SHALL NOT call the corresponding legacy service methods directly.

#### Scenario: Workbench applies a Topic Graph command
- **WHEN** a user rebuilds the Topic Graph index, decides a suggested edge, or resolves a Topic Graph review
- **THEN** the Workbench SHALL invoke the corresponding `client.topicGraph` method
- **AND** Topic Graph commands SHALL NOT be added to the Citation Graph `client.graph` capability

### Requirement: Topic Graph decision requests are strict and bounded
An edge decision request SHALL contain a non-empty, trimmed `edgeId`. A review request SHALL contain a non-empty, trimmed `reviewId` and exactly `approve_suggested | reject`. Unknown JSON-safe fields SHALL NOT be forwarded. Rebuild SHALL be a no-argument command.

#### Scenario: Edge decision request is valid
- **WHEN** an edge decision contains a non-empty string identifier
- **THEN** the adapter SHALL invoke the edge port with a rebuilt request containing only the trimmed `edgeId`

#### Scenario: Review decision request is valid
- **WHEN** a review decision contains a non-empty string identifier and an allowed action
- **THEN** the adapter SHALL invoke the review port with a rebuilt canonical request

#### Scenario: Decision request is invalid
- **WHEN** a request is not JSON-safe, an identifier is absent or empty after trimming, an identifier is not a string, or a review action is unsupported
- **THEN** the adapter SHALL reject with `invalid_request`
- **AND** it SHALL NOT invoke or resolve the legacy port

#### Scenario: Rebuild is invoked
- **WHEN** the Topic Graph projection is rebuilt
- **THEN** the adapter SHALL invoke the rebuild port without request data, callbacks, or streaming state

### Requirement: In-process Topic Graph commands normalize ports, results, and errors
The in-process adapter SHALL depend on four narrow legacy Topic Graph ports. It SHALL validate and rebuild decision requests before resolving ports, normalize each returned value through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error and `storage_busy`, and normalize an ordinary exception or non-JSON result to `internal`.

#### Scenario: Legacy Topic Graph command succeeds
- **WHEN** a configured Topic Graph port returns a result handled by shared JSON normalization
- **THEN** the client SHALL return the normalized opaque JSON-safe object

#### Scenario: Legacy Topic Graph command port is absent
- **WHEN** a caller invokes a Topic Graph command whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Legacy Topic Graph command fails
- **WHEN** a configured Topic Graph port throws an ordinary exception
- **THEN** the adapter SHALL reject with `internal`

#### Scenario: Topic Graph domain diagnostic is a valid result
- **WHEN** a port returns edge missing/not-suggested or review missing/closed with a singular diagnostic
- **THEN** the adapter SHALL return that normalized object
- **AND** it SHALL NOT rewrite the object as a client error

### Requirement: Existing Workbench Topic Graph behavior is preserved
The client-routed commands SHALL preserve identifier trimming, review action normalization, command single-flight, protected rebuild confirmation, deferred rebuild start, immediate mutation start, singular diagnostic handling, and existing surface invalidation. The client contract SHALL NOT carry progress callbacks or streaming state.

#### Scenario: Topic Graph rebuild runs
- **WHEN** the protected rebuild command is confirmed
- **THEN** it SHALL retain its empty single-flight arguments and `deferStart: true`
- **AND** it SHALL call the no-argument Topic Graph client method
- **AND** progress SHALL continue through the existing persisted Workbench progress poll
- **AND** rebuild SHALL retain default Home-only invalidation

#### Scenario: Edge decision runs
- **WHEN** a non-empty edge identifier is accepted or rejected
- **THEN** it SHALL retain the shared edge-decision single-flight key and immediate start
- **AND** it SHALL retain singular `failOnDiagnostic` handling

#### Scenario: Review action runs
- **WHEN** a Topic Graph review action enters command execution
- **THEN** exact `approve_suggested` SHALL remain approved and every other Workbench action value SHALL normalize to `reject`
- **AND** it SHALL retain review-scoped single-flight and singular `failOnDiagnostic` handling

#### Scenario: Topic Graph mutation settles
- **WHEN** edge accept/reject or review action completes or fails
- **THEN** the Workbench SHALL invalidate Home, Topics, Graph, and Review

### Requirement: Migration boundaries remain stable
This migration SHALL retain 125 public Synthesis service methods, exactly four direct legacy service consumers, and current process, repository, persistence, autosync, Host Bridge, MCP, and domain ownership.

#### Scenario: Static service boundaries are checked
- **WHEN** service inventory and direct-consumer checks run
- **THEN** the public service method count SHALL remain 125
- **AND** direct legacy consumers SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Out-of-scope Topic Graph operations are inspected
- **WHEN** the migration is reviewed
- **THEN** Topic Graph queries/checkpoint export, discovery hints, Citation Graph, Host Bridge, and MCP paths SHALL remain unchanged
