## MODIFIED Requirements

### Requirement: Public synthesis client remains unchanged

Routing the complete production surface through the Rust sidecar SHALL be an internal production-composition decision and SHALL NOT add a public `SynthesisClient` method or change Workbench, workflow, Host Bridge, or MCP callers.

#### Scenario: Public client inventory is checked
- **WHEN** the native production route is enabled
- **THEN** the code-derived public client surface remains at its current 96 methods with one composition owner
- **AND** stale 108-method planning text is corrected without inventing methods

## ADDED Requirements

### Requirement: Production client composition SHALL be native-only

After a completed cutover receipt, the default production composition SHALL use only the authenticated native client and reverse-Host ports. Retained legacy code MAY be invoked by isolated tests but MUST be unreachable from production composition.

#### Scenario: Production dependency graph is checked
- **WHEN** static client-boundary validation runs after cutover
- **THEN** no default-client, Workbench, workflow, Host Bridge, MCP, or startup path imports or creates legacy composition
