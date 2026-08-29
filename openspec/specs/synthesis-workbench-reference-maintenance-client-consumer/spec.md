# synthesis-workbench-reference-maintenance-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for reference maintenance operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Reference maintenance commands use a bounded client capability

The Synthesis client SHALL expose a `references` capability with no-argument commands for Reference Sidecar refresh, Reference Sidecar retry, advanced reference matching, and advanced matching retry. The Workbench SHALL lazily resolve the default client and SHALL NOT call the corresponding legacy service methods directly.

#### Scenario: Workbench starts Reference maintenance
- **WHEN** a user starts or retries Reference Sidecar refresh or advanced reference matching
- **THEN** the Workbench SHALL invoke the corresponding `client.references` method
- **AND** the result SHALL cross the client boundary as an opaque JSON-safe object

### Requirement: In-process Reference commands normalize ports, results, and errors

The in-process adapter SHALL depend on four narrow legacy Reference maintenance ports, normalize each successful result through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error, and normalize an ordinary legacy exception to `internal`.

#### Scenario: Legacy Reference command succeeds
- **WHEN** a configured Reference maintenance port returns a result containing values handled by the shared JSON normalization rules
- **THEN** the client SHALL return the normalized opaque JSON-safe object

#### Scenario: Legacy Reference command port is absent
- **WHEN** a caller invokes a Reference maintenance command whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Legacy Reference command fails
- **WHEN** a configured Reference maintenance port throws an ordinary exception
- **THEN** the adapter SHALL reject with `internal`

### Requirement: Reference maintenance progress does not cross the client contract

Reference maintenance contracts SHALL NOT accept or return UI progress callbacks, streaming hooks, or Workbench-owned DTOs. Workbench command progress SHALL continue to come from the existing 500 ms `workbench.readProgress()` polling path.

#### Scenario: Long Reference maintenance command starts
- **WHEN** Reference Sidecar refresh, advanced matching, or advanced matching retry starts
- **THEN** the Workbench SHALL invoke the Reference client method without an `onProgress` callback
- **AND** existing persisted-operation polling SHALL remain active

#### Scenario: Other command domains use callback progress
- **WHEN** Tag, Concept, or Topic Graph commands use the shared progress helper
- **THEN** that helper SHALL remain available outside the Reference client contracts

### Requirement: Existing Workbench command behavior is preserved

The client-routed commands SHALL preserve protected confirmation, command single-flight, deferred-start distinctions, error presentation, and Index, Review, and Graph surface invalidation.

#### Scenario: Protected maintenance is requested
- **WHEN** Reference Sidecar refresh or advanced reference matching is requested
- **THEN** the Workbench SHALL retain the existing confirmation before command execution
- **AND** the command SHALL retain `deferStart: true`

#### Scenario: Maintenance retry is requested
- **WHEN** Reference Sidecar retry is requested
- **THEN** it SHALL remain confirmation-free and non-deferred
- **AND** advanced matching retry SHALL remain confirmation-free with `deferStart: true`

#### Scenario: Reference maintenance completes
- **WHEN** any migrated Reference maintenance command settles
- **THEN** the Workbench SHALL preserve single-flight cleanup and existing error presentation
- **AND** it SHALL invalidate Index, Review, and Graph surfaces as before

### Requirement: Migration boundaries remain stable

This migration SHALL retain 125 public Synthesis service methods, exactly four direct legacy service consumers, all existing public Reference service methods, and current process, repository, persistence, Host Bridge, and MCP ownership.

#### Scenario: Static service boundaries are checked
- **WHEN** service inventory and direct-consumer checks run
- **THEN** the public service method count SHALL remain 125
- **AND** direct legacy consumers SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Out-of-scope Reference operations are inspected
- **WHEN** the migration is reviewed
- **THEN** Reference queries, proposal actions, canonical mutations, related-items sync, and workflow apply SHALL remain on their current paths
