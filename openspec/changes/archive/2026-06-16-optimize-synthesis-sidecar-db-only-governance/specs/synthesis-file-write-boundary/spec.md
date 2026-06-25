## MODIFIED Requirements

### Requirement: Cache reads do not write files
Synthesis read paths SHALL NOT write canonical files, sidecar files, empty
domain directories, or operation rows.

#### Scenario: Workbench snapshot is read
- **WHEN** Workbench reads Synthesis state
- **THEN** it SHALL not refresh cache projections or write source artifacts
- **AND** it SHALL not mutate topic, tag, concept, graph, or reference state
- **AND** it SHALL not create empty `data/synthesis/tags`,
  `data/synthesis/concepts`, `data/synthesis/topic-graph`, or
  `data/synthesis/citation-graph` directories.

### Requirement: Explicit operations own their write boundaries
Explicit Synthesis operations SHALL write only their documented sidecar, cache,
projection, topic artifact, sync transport, or debug outputs.

#### Scenario: Reference sidecar apply reruns unchanged input
- **GIVEN** a literature-analysis apply has the same source ref, artifact
  hashes, and matched-reference payload hash as the ready reference-sidecar
  cache basis
- **WHEN** the apply path runs again
- **THEN** it SHALL skip stale canonical governance
- **AND** it SHALL not mark citation graph or related-items sync caches stale
  for that source.

#### Scenario: Projection rebuild runs
- **WHEN** tag, concept, or topic graph projection rebuild runs
- **THEN** it SHALL record projection state in SQLite-backed repository state
- **AND** it SHALL NOT write `sidecar/tag-index.json`,
  `sidecar/concept-kb-index.json`, or `sidecar/topic-graph-index.json`.
