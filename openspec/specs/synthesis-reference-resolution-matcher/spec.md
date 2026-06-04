## Purpose

Reference matcher output becomes graph-affecting state only through safe apply or explicit decisions.
## Requirements
### Requirement: Matcher output affects graph only through explicit decisions or safe apply
Reference matcher output SHALL become graph-affecting state only through deterministic safe apply for the current item, deterministic/high-confidence explicit advanced matching, or explicit user-approved sidecar decisions.

#### Scenario: Fuzzy canonical dedupe candidate is produced
- **WHEN** Advanced Reference Matching finds a fuzzy canonical-to-canonical candidate
- **THEN** Synthesis SHALL store it only as a `canonical_merge` proposal
- **AND** it SHALL NOT write a canonical redirect automatically.

### Requirement: Heavy matcher is explicit
The production reference matcher SHALL run only from an explicit advanced matching command or scoped test/benchmark harness.

#### Scenario: Reference sidecar refresh runs
- **WHEN** `refreshReferenceSidecarNow` or workflow apply updates sidecar rows
- **THEN** it SHALL NOT call `buildReferenceMatcherIndex` or `resolveReferenceWithPolicy`
- **AND** it SHALL keep lightweight binding semantics.

### Requirement: Advanced matcher reuses one library index
Advanced matching SHALL build the library matcher index once per operation and reuse it for processed references.

#### Scenario: Advanced matching processes many references
- **WHEN** `runAdvancedReferenceMatchingNow` runs
- **THEN** it SHALL build one matcher index for the current library scope
- **AND** each processed reference SHALL use that existing index.

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

### Requirement: Advanced matching includes external dedupe
Advanced Reference Matching SHALL include an explicit external dedupe pass that compares unbound effective canonical references.

#### Scenario: Duplicate canonical references share a strong identifier
- **WHEN** unbound canonical references share a unique DOI or arXiv identity
- **THEN** Advanced Reference Matching MAY write an accepted canonical redirect
- **AND** it SHALL mark citation graph cache stale without rebuilding graph cache.

#### Scenario: Duplicate canonical references share title evidence
- **WHEN** unbound canonical references share normalized, compact, or strong compact title evidence
- **THEN** Advanced Reference Matching SHALL either write a safe redirect or create a bounded `canonical_merge` proposal according to the dedupe policy.

### Requirement: Refresh remains lightweight
Reference Sidecar refresh and workflow apply SHALL NOT run the advanced external dedupe pass.

#### Scenario: Refresh processes changed references
- **WHEN** refresh or workflow apply inserts raw references
- **THEN** it SHALL keep lightweight canonical assignment and binding behavior
- **AND** it SHALL NOT create advanced fuzzy `canonical_merge` proposals.

