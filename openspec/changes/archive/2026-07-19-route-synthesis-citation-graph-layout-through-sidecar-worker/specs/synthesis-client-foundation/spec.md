## ADDED Requirements

### Requirement: Production layout routing is internal to client composition
The production Synthesis client composition SHALL supply the sidecar-backed
layout engine without changing public graph methods, request DTOs, result DTOs,
or direct-consumer ownership.

#### Scenario: Existing graph client invokes layout
- **WHEN** a caller uses `SynthesisClient.graph.recomputeCitationGraphLayout`
- **THEN** its public input and output contract remains unchanged
- **AND** routing is selected only by internal production composition

