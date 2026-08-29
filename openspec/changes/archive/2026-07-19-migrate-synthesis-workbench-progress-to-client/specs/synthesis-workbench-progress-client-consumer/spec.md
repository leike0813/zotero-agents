## ADDED Requirements

### Requirement: Workbench progress polling uses a narrow client query
The Synthesis Workbench SHALL obtain operation progress through the no-argument `SynthesisClient.workbench.readProgress` capability and SHALL NOT call the legacy service progress method directly.

#### Scenario: Workbench polls operation progress
- **WHEN** the production Workbench refreshes command progress
- **THEN** it SHALL lazily resolve the default client and call `workbench.readProgress`
- **AND** the client result SHALL be an opaque JSON-safe Workbench projection containing maintenance background jobs

#### Scenario: In-process progress read fails
- **WHEN** the legacy progress port throws a non-client exception
- **THEN** the in-process adapter SHALL reject with the stable internal client error code

### Requirement: Progress queries are side-effect-free
Service construction, background-job progress reads, client progress reads, and debug progress reads SHALL NOT reconcile or mutate persisted operation lifecycle state.

#### Scenario: A running operation is read during a live session
- **GIVEN** a persisted operation has status `running`
- **WHEN** any ordinary progress, chrome, client, or debug read executes
- **THEN** the operation SHALL remain `running`

#### Scenario: Service is constructed with a running operation
- **GIVEN** a persisted operation has status `running`
- **WHEN** the Synthesis service factory constructs its public surface
- **THEN** construction SHALL NOT cancel or otherwise update that operation

### Requirement: Restart-orphan reconciliation belongs only to startup
The explicit Synthesis startup reconciliation lifecycle SHALL cancel every persisted `running` operation as a restart orphan and SHALL NOT use elapsed timestamp age to cancel operations during a live session.

#### Scenario: Startup finds persisted running operations
- **GIVEN** one or more persisted operations have status `running` regardless of their updated timestamps
- **WHEN** `reconcileSynthesisRuntimeWorkStateOnStartup` executes
- **THEN** every such operation SHALL become `canceled`
- **AND** each SHALL retain the restart-orphan diagnostic semantics

#### Scenario: A live operation has not updated for thirty minutes
- **GIVEN** the current process owns a running operation whose timestamp is older than thirty minutes
- **WHEN** ordinary progress reads execute without a startup transition
- **THEN** the operation SHALL remain `running`

### Requirement: Existing Workbench progress behavior is preserved
The client-routed progress poll SHALL preserve Git Sync chrome composition, 500 ms cadence, concurrent-poll locking, cached and runtime projection merge, snapshot locking, transient-error fallback, chrome-only publication, and command single-flight behavior.

#### Scenario: A progress projection is received
- **WHEN** `readProgress` returns maintenance background jobs
- **THEN** the Workbench SHALL merge the projection into cached chrome and the active runtime snapshot
- **AND** it SHALL publish chrome without refreshing a content surface

#### Scenario: A progress poll fails transiently
- **WHEN** `readProgress` rejects during polling
- **THEN** the Workbench SHALL retain the existing fallback behavior and release its concurrency guard

### Requirement: Migration boundaries remain stable
This change SHALL retain the public background-job service method, service migration inventory, 125-method public service surface, four direct legacy consumers, and existing process and storage ownership.

#### Scenario: Service boundaries are checked
- **WHEN** the migration boundary tests inspect the implementation
- **THEN** the public service method count SHALL remain 125
- **AND** the direct legacy consumers SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Out-of-scope surfaces are inspected
- **WHEN** the progress client migration is reviewed
- **THEN** commands, mutations, Host Bridge, and MCP SHALL remain on their current paths
