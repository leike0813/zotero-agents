## ADDED Requirements

### Requirement: Clustered canonical dedupe is available for explicit experiments
The reference matcher SHALL expose a pure clustered canonical dedupe function
that consumes `ReferenceCanonicalDedupeInput` records and returns clusters,
edges, actions, counters, and diagnostics without mutating persistence.

#### Scenario: Semantic title extension is detected
- **WHEN** two canonical references have a title containment relationship and
  the longer title contains meaningful extension terms
- **THEN** the clustered dedupe function SHALL classify the edge as
  `contained_extension_risk`
- **AND** it SHALL NOT emit a redirect action for that pair.

#### Scenario: Bare DOI or URL rows are filtered before matching
- **WHEN** a canonical record's selected title is only a DOI, URL, or too few
  effective title tokens
- **THEN** the clustered dedupe function SHALL classify it as `excluded`
- **AND** it SHALL NOT include it in blocking, edges, redirects, or review
  actions.
- **AND** it SHALL record diagnostics for harness inspection.

#### Scenario: Concrete venue name lacks structural suffix evidence
- **WHEN** contained-title extra tokens include only a venue-like name without
  proceedings, page, volume/issue, DOI/arXiv, or publisher/editor structure
- **THEN** the clustered dedupe function SHALL NOT classify the edge as
  `contained_bibliographic_noise` solely from the venue token.

#### Scenario: Structured bibliographic suffix is detected
- **WHEN** contained-title extra tokens include DOI/arXiv suffixes,
  proceedings/page phrases, volume/issue/page patterns, or editor/publisher
  suffixes
- **THEN** the clustered dedupe function SHALL classify the edge as
  `contained_bibliographic_noise`
- **AND** it SHALL include classifier reasons in edge evidence.

#### Scenario: Strong identifier duplicates are clustered
- **WHEN** two canonical references share a unique DOI or arXiv identifier
- **THEN** the clustered dedupe function MAY emit a redirect action
- **AND** it SHALL include the identifier evidence in the cluster result.

#### Scenario: Noisy raw-heavy title competes with a clean title
- **WHEN** one canonical reference has many raw references but its selected
  title contains bibliographic or author noise
- **AND** another member has a cleaner compatible title
- **THEN** representative selection SHALL prefer the clean/stable title over
  raw-count-first ordering.
- **AND** representative quality SHALL use the structured noise evidence rather
  than duplicating long venue-token checks.

#### Scenario: Existing merged representative is processed again
- **WHEN** an effective canonical already has inbound redirects
- **THEN** the clustered dedupe function SHALL treat it as a sticky
  representative
- **AND** it SHALL NOT retarget the cluster unless strong deterministic DOI,
  arXiv, or safe exact-title evidence allows retarget.

#### Scenario: Cluster actions are emitted
- **WHEN** a redirect action is emitted for a cluster
- **THEN** the action target SHALL be the final cluster representative.

#### Scenario: Fuzzy comparison exceeds budget
- **WHEN** candidate generation exceeds the configured block or pair budget
- **THEN** the clustered dedupe function SHALL record diagnostics
- **AND** it SHALL NOT widen the comparison to a global all-pairs scan.

### Requirement: Production promotion uses the clustered dedupe path
The clustered dedupe function SHALL be the production canonical external dedupe
implementation after `promote-cluster-reference-dedupe-to-production`, while
the harness remains isolated from production persistence.

#### Scenario: Advanced matching runs in the plugin
- **WHEN** `runAdvancedReferenceMatchingNow` performs external dedupe
- **THEN** it SHALL call the clustered canonical dedupe function.
- **AND** harness debug decisions SHALL NOT be written to production proposal or
  redirect rows.
