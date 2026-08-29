# synthesis-client-foundation Specification

## Purpose
Defines the Synthesis client foundation, specifying the core service wiring, dependency injection, and lifecycle integration.
## Requirements
### Requirement: Production layout routing is internal to client composition

The production Synthesis client composition SHALL supply the sidecar-backed
layout engine without changing public graph methods, request DTOs, result DTOs,
or direct-consumer ownership.

#### Scenario: Existing graph client invokes layout
- **WHEN** a caller uses `SynthesisClient.graph.recomputeCitationGraphLayout`
- **THEN** its public input and output contract remains unchanged
- **AND** routing is selected only by internal production composition

### Requirement: Public synthesis client remains unchanged

Routing the complete production surface through the Rust sidecar SHALL be an internal production-composition decision and SHALL NOT add a public `SynthesisClient` method or change Workbench, workflow, Host Bridge, or MCP callers.

#### Scenario: Public client inventory is checked
- **WHEN** the native production route is enabled
- **THEN** the code-derived public client surface remains at its current 96 methods with one composition owner
- **AND** stale 108-method planning text is corrected without inventing methods

### Requirement: Internal metrics adapter is fail closed

The internal sidecar metrics engine adapter SHALL use the authenticated compute
client and SHALL NOT expose retry or fallback behavior to production callers.

#### Scenario: Compute transport fails
- **WHEN** the authenticated metrics request fails in transport or worker execution
- **THEN** the adapter returns the stable internal error and does not invoke the in-process engine

### Requirement: Production client composition SHALL be native-only

The default production composition SHALL use only the authenticated
current-session native client and bounded reverse-Host ports. The plugin
source and build graph MUST NOT contain a legacy production composition,
in-process owner factory, service/repository owner, or test/harness path capable
of constructing that owner. Tests MAY build the public client over a bounded
fake port but MUST NOT recreate production persistence or application
composition.

#### Scenario: Production dependency graph is checked
- **WHEN** static client-boundary validation runs after plugin legacy retirement
- **THEN** no default-client, Workbench, workflow, Host Bridge, MCP, startup, maintenance, test, or harness path imports or creates a plugin legacy owner
- **AND** no implementation selector can restore that route

#### Scenario: Native service is unavailable
- **WHEN** a caller acquires or invokes the production client without a verified native owner
- **THEN** the call fails through the stable maintenance, unavailable, incompatible, or repair-required category
- **AND** no plugin service, repository, engine composition, or production root is opened

### Requirement: Grouped client adaptation SHALL be owner-neutral

The mapping from the closed production operation port to the grouped
`SynthesisClient` facade SHALL be owned by one neutral adapter. The adapter MUST
contain no persistence, canonical, Host, engine, service, lifecycle, transport,
or implementation-selection logic, and both native production composition and
bounded test ports SHALL reuse the same mapping.

#### Scenario: Native composition builds the grouped client
- **WHEN** the verified native composition receives a ready production port
- **THEN** it constructs the unchanged grouped public client through the neutral adapter
- **AND** the port and public client exactly match the current production operation manifest

#### Scenario: Neutral adapter dependencies are inspected
- **WHEN** its import and export graph is checked
- **THEN** it depends only on public contracts, DTO rebuilders, stable error mapping, and the supplied port
- **AND** it exports no in-process owner or service factory

