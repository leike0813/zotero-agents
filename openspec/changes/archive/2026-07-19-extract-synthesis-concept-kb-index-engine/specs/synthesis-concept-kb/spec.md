## MODIFIED Requirements

### Requirement: Concept KB projection is rebuildable

Synthesis Concept KB SHALL use the configured Concept KB index engine to
compute deterministic search and overlay rows for the rebuildable
`concept-kb-index` projection while the application owns repository reads,
manifest basis, review rows, relations, diagnostics, progress, and projection
registry promotion.

#### Scenario: Projection is rebuilt

- **WHEN** an explicit Concept KB projection rebuild runs
- **THEN** the application SHALL build and strictly validate the index against
  the current manifest basis through the configured engine
- **AND** only a valid result SHALL advance projection registry state.

#### Scenario: Engine computation fails

- **WHEN** the engine throws, is cancelled, exceeds bounds, or returns a
  malformed result
- **THEN** the last durable Concept KB state and projection registry state
  SHALL remain unchanged.

### Requirement: Concept KB exposes overlay entries only for high-confidence, unambiguous aliases

Synthesis Concept KB SHALL compute overlay entries through the configured
Concept KB index engine and expose only aliases that are active,
non-low-confidence, unambiguous, and attached to an active concept.

#### Scenario: Alias resolves to multiple concepts

- **WHEN** the same normalized active alias points to multiple concepts
- **THEN** the alias SHALL be excluded from overlay entries.

### Requirement: Concept KB exposes read-only alias matching context

Synthesis Concept KB SHALL use the configured Concept KB index engine to expose
bounded read-only candidate matching context for topic synthesis enrichment.

#### Scenario: Candidate labels are queried

- **WHEN** runtime queries Concept KB with `concept_candidate_labels[]`
- **THEN** the service SHALL preserve existing exact, alias, sense candidate,
  ambiguity, and diagnostic response semantics
- **AND** it SHALL NOT mutate canonical Concept KB or review state.
