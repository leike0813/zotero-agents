# Spec Delta

## MODIFIED Requirements

### Requirement: Stage 10 SHALL collect Host context as a runtime cascade

The runtime SHALL perform deterministic Host Bridge collection after a valid Stage 10 payload is submitted.

The runtime SHALL validate graph context requests against a maximum of 100 nodes and 200 edges, with defaults of 80 nodes and 160 edges.

#### Scenario: Graph context exceeds Host limits

- **GIVEN** the submitted context request asks for more than 100 nodes or 200 edges
- **WHEN** Stage 10 validates the submission
- **THEN** it SHALL reject the payload before issuing Host context requests.

#### Scenario: Host Bridge returns citation graph, layout, concepts, and reference artifacts

- **GIVEN** Host Bridge CLI is available in the run workspace
- **AND** the context request asks for citation graph, concepts, and library reference digests
- **WHEN** Stage 10 is submitted
- **THEN** the runtime SHALL call semantic Host Bridge CLI commands
- **AND** it SHALL write `runtime/views/host-context-view.json`
- **AND** it SHALL write `runtime/views/reference-bindings-view.json`
- **AND** it SHALL write `runtime/views/reference-digests-view.json`
- **AND** it SHALL write `runtime/views/citation-graph-snapshot.json`
- **AND** it SHALL write `runtime/views/citation-graph-layout.json`
- **AND** it SHALL write `runtime/views/concept-candidates-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-host-context.json`.

#### Scenario: Reference index and graph requests follow their production contracts

- **WHEN** bootstrap preflight or Stage 10 collects the target paper's reference index
- **THEN** each request SHALL contain `sourceRefs`, `includeReferences`, and `limit`, plus `cursor` when continuing a page
- **WHEN** Stage 10 requests a citation graph slice
- **THEN** it SHALL send the low-signal selection as `filters.includeLowSignal`
- **AND** the corresponding layout request SHALL use its own contract with top-level `includeLowSignal`.
