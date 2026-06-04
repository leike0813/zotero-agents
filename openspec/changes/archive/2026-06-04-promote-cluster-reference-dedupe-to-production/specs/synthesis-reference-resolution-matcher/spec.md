## MODIFIED Requirements

### Requirement: Clustered canonical dedupe is available for explicit experiments
The reference matcher SHALL expose a pure clustered canonical dedupe function
that consumes `ReferenceCanonicalDedupeInput` records and returns clusters,
edges, actions, counters, and diagnostics without mutating persistence.

#### Scenario: Production advanced matching runs external dedupe
- **WHEN** `runAdvancedReferenceMatchingNow` performs external dedupe
- **THEN** it SHALL call `dedupeCanonicalReferencesClustered`
- **AND** it SHALL NOT call or expose the old pairwise canonical dedupe API.

#### Scenario: Semantic title extension is detected
- **WHEN** two canonical references have a title containment relationship and
  the longer title contains meaningful extension terms
- **THEN** the clustered dedupe function SHALL classify the edge as
  `contained_extension_risk`
- **AND** it SHALL NOT emit a redirect action for that pair.

#### Scenario: Cluster review action is produced
- **WHEN** the clustered dedupe function emits a review action
- **THEN** production advanced matching SHALL persist it as a
  `canonical_merge` proposal with cluster id, edge type, risk signals, and
  representative rationale in evidence.

#### Scenario: Cluster redirect action is produced
- **WHEN** the clustered dedupe function emits a redirect action
- **THEN** production advanced matching SHALL persist it as an accepted
  canonical redirect fact.

### Requirement: Production promotion uses the clustered dedupe path
The clustered dedupe function SHALL replace the old production pairwise
external-dedupe path.

#### Scenario: Production dedupe input is built
- **WHEN** production advanced matching builds canonical dedupe inputs
- **THEN** it SHALL aggregate active raw support through effective canonical
  redirects
- **AND** it SHALL include title candidates from effective canonical rows,
  physical canonical rows, and raw parsed titles
- **AND** it SHALL mark existing redirect targets as sticky representatives
- **AND** it SHALL exclude accepted Zotero-bound canonicals from external dedupe.

#### Scenario: Lightweight paths execute
- **WHEN** Reference Sidecar refresh or literature-digest workflow apply runs
- **THEN** neither path SHALL call clustered external dedupe.
