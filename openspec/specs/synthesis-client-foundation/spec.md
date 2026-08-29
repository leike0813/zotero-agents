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

After a completed cutover receipt, the default production composition SHALL use only the authenticated native client and reverse-Host ports. Retained legacy code MAY be invoked by isolated tests but MUST be unreachable from production composition.

#### Scenario: Production dependency graph is checked
- **WHEN** static client-boundary validation runs after cutover
- **THEN** no default-client, Workbench, workflow, Host Bridge, MCP, or startup path imports or creates legacy composition

