# topic-synthesis-structured-artifact Specification

## Purpose
TBD - created by archiving change redesign-topic-synthesis-structured-artifact. Update Purpose after archive.
## Requirements
### Requirement: Topic synthesis has a structured canonical artifact


Topic synthesis SHALL use its structured JSON artifact and
`synthesis_report.body` as the persisted display and report source of truth.

#### Scenario: Host apply persists structured current files without markdown export

- **WHEN** Host apply persists a create or update-full topic synthesis artifact
- **THEN** the current topic directory SHALL contain current manifest, metadata,
  artifact, and section JSON files
- **AND** it SHALL NOT write `current/export.md`
- **AND** current metadata SHALL NOT include markdown/export hashes
- **AND** the persisted artifact SHALL include `synthesis_report.body` as the
  report Markdown source.
### Requirement: Claims and timeline events use library paper evidence








Structured topic claims and timeline events SHALL be grounded in library papers
from the resolved paper set.

#### Scenario: Claim is represented

- **WHEN** a claim appears in the structured artifact
- **THEN** it SHALL reference at least one `paper_evidence` entry
- **AND** each referenced paper evidence entry SHALL correspond to a resolved
  library paper.

#### Scenario: Timeline event is represented

- **WHEN** a timeline event appears in the structured artifact
- **THEN** it SHALL reference at least one `paper_evidence` entry or explicit
  topic phase derived from library paper evidence
- **AND** it SHALL NOT rely on an external reference as the main evidence node.
### Requirement: External literature is analyzed separately








External references from references and citation-analysis artifacts SHALL be
summarized in a dedicated external literature analysis section rather than
promoted into main timeline evidence nodes.

#### Scenario: External references are available

- **WHEN** references or citation-analysis artifacts contain library-external
  works relevant to the topic
- **THEN** the structured artifact SHALL include external literature analysis
  prose
- **AND** it SHALL include representative references and citation contexts when
  available.

#### Scenario: External references are sparse

- **WHEN** external reference metadata is incomplete
- **THEN** external literature analysis SHALL record limitations or confidence
  constraints
- **AND** it SHALL NOT fabricate missing bibliographic details.
### Requirement: Topic synthesis final products remain structured-only








The topic synthesis skill runtime SHALL not emit run-workspace markdown exports.

#### Scenario: Final validation creates only structured run artifacts

- **WHEN** final validation succeeds
- **THEN** create/update full writes `result/topic-analysis.json` and
  `result/result.json` or `result/final-output.candidate.json`
- **AND** section and sidecar manifest entries SHALL include `path` and
  `content_type`
- **AND** manifest entry hashes SHALL NOT be required
- **AND** no `preview.md`, `export.md`, or `markdown_path` is part of the skill
  output contract.
### Requirement: Structured topic artifacts preserve staged section semantics








The structured topic artifact SHALL be assembled from sections that passed
their authoring-stage semantic validation.

#### Scenario: Route and timeline sections are persisted

- **WHEN** final topic sections include `taxonomy` and `timeline_events`
- **THEN** those sections SHALL match the Stage 7 validated route/timeline
  artifact unless explicitly replaced by a valid patch.

#### Scenario: Core analytical sections are persisted

- **WHEN** final topic sections include claims, comparison, debates, gaps,
  positioning, or review outline
- **THEN** those sections SHALL match the Stage 8 validated core artifact unless
  explicitly replaced by a valid patch.
### Requirement: Topic synthesis artifacts SHALL expose a complete structured content contract








The system SHALL require a topic synthesis artifact to contain the existing
core sections plus `statistics` and `synthesis_report`.

#### Scenario: Empty-shell sections are rejected

- **WHEN** a topic artifact omits discipline/field/scope metadata, research
  route analysis, timeline progression details, external literature coverage
  judgment, statistics, or report prose
- **THEN** validation SHALL reject the artifact before apply succeeds.
### Requirement: Topic synthesis content SHALL support both Workbench reading and review writing








The content contract SHALL require route analysis, timeline progression,
argued findings, external literature analysis, coverage/statistics, and a
continuous report suitable for downstream literature writing workflows.

#### Scenario: External literature is analyzed separately from primary evidence

- **WHEN** external references are present
- **THEN** they SHALL be analyzed in `external_literature_analysis`
- **AND** they SHALL NOT become primary claim or timeline evidence.
### Requirement: Taxonomy contains integrated route synthesis








The structured topic artifact SHALL include `taxonomy.summary` as a first-class
integrated analysis of all taxonomy nodes.

#### Scenario: Taxonomy summary is missing

- **WHEN** a complete topic synthesis artifact omits `taxonomy.summary`
- **THEN** validation fails before apply.
### Requirement: Timeline contains integrated historical synthesis








The structured topic artifact SHALL represent `timeline_events` as an object
with `summary` and `events`.

#### Scenario: Timeline is authored as a bare array

- **WHEN** a new complete topic synthesis artifact uses a bare array for
  `timeline_events`
- **THEN** validation fails before apply.
### Requirement: Report records section-source chapters








The synthesis report SHALL record that its route and historical-progression
chapters derive from `taxonomy.summary` and `timeline_events.summary`.

#### Scenario: Report omits source chapter binding

- **WHEN** a complete topic synthesis artifact contains `synthesis_report`
  without `source_section_chapters`
- **THEN** validation fails before apply
- **AND** the error identifies the missing report source binding.
### Requirement: Skill output uses structured-only run artifacts








Topic synthesis skills SHALL leave Markdown compatibility export rendering to
the host.

#### Scenario: A create or full update run returns markdown preview paths

- **WHEN** a complete topic synthesis final bundle or section manifest includes
  `markdown_path`, `preview.md`, or `export.md` as run-workspace outputs
- **THEN** validation fails before host persistence
- **AND** host apply renders canonical `current/export.md` only after the
  structured artifact has been materialized.
### Requirement: Relation proposals remain sidecar artifacts








Topic graph relation proposals SHALL NOT become structured topic artifact sections or Markdown export source content.

#### Scenario: Structured artifact is assembled

- **WHEN** a topic synthesis final bundle includes `topic_graph_relation_proposals_path`
- **THEN** the host SHALL keep relation proposals outside the structured artifact sections
- **AND** structured artifact validation SHALL NOT require a relation proposal section.
### Requirement: Concept card proposals remain sidecar artifacts








Concept card proposals SHALL NOT become structured topic artifact sections or Markdown export source content.

#### Scenario: Structured artifact is assembled

- **WHEN** a topic synthesis final bundle includes `concept_cards_proposal_path`
- **THEN** the host SHALL keep concept card proposals outside structured artifact sections
- **AND** structured artifact validation SHALL NOT require a concept card section.
### Requirement: KG proposals remain outside structured topic artifact source of truth








Concept card proposals and topic graph relation proposals SHALL remain sidecars and SHALL NOT become sections or embedded fields in the structured topic synthesis artifact.

#### Scenario: Final structured artifact is assembled

- **WHEN** runtime assembles `result/topic-analysis.json` or `result/topic-analysis.patch.json`
- **THEN** it SHALL NOT include concept cards or topic graph relation proposal bodies
- **AND** host apply SHALL consume those proposals only through final bundle sidecar paths.
### Requirement: Timeline events expose runtime-derived markers








The structured topic artifact SHALL expose `timeline_events.markers` as the
primary timeline rendering input for new artifacts.

#### Scenario: Timeline markers are present

- **WHEN** a new complete topic synthesis artifact contains `timeline_events`
- **THEN** it SHALL include `timeline_events.markers`
- **AND** each marker SHALL identify a paper evidence id and year when
  available
- **AND** marker type, event id, and deduplication SHALL be runtime-derived.

#### Scenario: Agent-authored timeline events are milestones

- **WHEN** an agent authors timeline events in the core synthesis payload
- **THEN** those events SHALL be treated as milestone candidates
- **AND** the agent-facing payload SHALL NOT expose `marker_kind`.
### Requirement: Improvement dimensions replace comparison matrix authoring








The structured artifact SHALL support improvement dimension analysis as the
preferred representation for method progress and tradeoffs.

#### Scenario: Improvement dimensions are materialized

- **WHEN** core synthesis provides `improvement_dimensions[]`
- **THEN** the final artifact SHALL preserve those dimensions as structured
  content
- **AND** runtime MAY derive a compatibility `comparison_matrix` only when
  needed for legacy consumers.

#### Scenario: New artifact omits comparison matrix

- **WHEN** a new artifact uses improvement dimensions
- **THEN** validation SHALL NOT require an agent-authored `comparison_matrix`.
### Requirement: Statistics and report are runtime materialized








The structured artifact SHALL treat statistics and synthesis report as
runtime-materialized sections.

#### Scenario: Statistics are materialized

- **WHEN** final materialization runs
- **THEN** `statistics.graph_statistics` SHALL be derived from graph/canonical
  data or marked with a structured stale/missing caveat
- **AND** the agent SHALL NOT be the source of numeric graph statistics.

#### Scenario: Synthesis report is materialized

- **WHEN** final materialization runs
- **THEN** `synthesis_report` SHALL be rendered from a fixed template and
  validated section sources
- **AND** the agent SHALL NOT author the final report body directly.
### Requirement: Host apply avoids digest hash freshness blocking








Host apply SHALL treat digest references as locators, not freshness proofs.

#### Scenario: Digest hash is absent or stale

- **WHEN** a topic synthesis artifact references an available digest artifact by
  paper ref and payload type
- **AND** `digest_ref.payload_hash` is absent or differs from the current digest
  artifact hash
- **THEN** Host apply SHALL NOT reject the artifact for that hash mismatch.

#### Scenario: Digest body is embedded

- **WHEN** a topic synthesis artifact embeds full digest markdown in
  `paper_evidence`
- **THEN** Host apply SHALL reject the artifact.
### Requirement: Topic synthesis structured artifact SHALL use consolidated sections






Complete topic synthesis artifacts SHALL avoid standalone sections that only
repeat a single neighboring concept.

#### Scenario: Improvement dimensions are consolidated

- **WHEN** a complete topic synthesis artifact is produced
- **THEN** `improvement_dimensions` SHALL be an object with `summary` and
  `dimensions`
- **AND** the manifest SHALL NOT contain an `improvement_dimension_summary`
  section.

#### Scenario: External literature is part of coverage

- **WHEN** a complete topic synthesis artifact is produced
- **THEN** external literature coverage SHALL be stored under
  `coverage.external_literature`
- **AND** the manifest SHALL NOT contain an `external_literature_analysis`
  section.
### Requirement: Complete topic artifact sections




The complete topic synthesis artifact SHALL NOT include a top-level
`positioning` section.

#### Scenario: Complete manifest removes positioning

- **WHEN** split finalize materializes a complete topic artifact
- **THEN** the manifest sections do not include `positioning`
- **AND** the assembled artifact does not include `positioning`
### Requirement: Summary section shape





The summary section SHALL avoid duplicated synonymous fields.

#### Scenario: Summary has no long summary clone

- **WHEN** split finalize materializes `result/sections/summary.json`
- **THEN** the summary object contains `brief`, `summary`, and
  `key_takeaways`
- **AND** it does not contain `long_summary`
### Requirement: Future directions source refs





Future directions SHALL use `source_paper_refs` to reference source papers.

#### Scenario: Future direction refs are valid

- **WHEN** a complete artifact is validated
- **THEN** each `future_directions[]` row with `source_paper_refs` references
  existing `source_papers[].paper_ref`
### Requirement: Coverage caveats are coverage-owned





Coverage caveats SHALL remain inside `coverage.coverage_caveats`.

#### Scenario: Coverage caveats are not copied into future directions

- **WHEN** Stage 60 submits coverage caveats
- **THEN** they remain in the coverage section
- **AND** runtime does not copy them into `future_directions`
### Requirement: Topic scope boundary




The topic section SHALL be the only artifact section that carries the topic
scope boundary.

#### Scenario: Topic scope is authoritative

- **WHEN** a complete artifact is validated
- **THEN** `topic.scope_boundary` is accepted as the topic boundary
- **AND** no `positioning.scope_boundary` is required or accepted as a
  contract field
### Requirement: Review writing strategies




The review outline section SHALL describe review-writing strategies.

#### Scenario: Review outline has strategies

- **WHEN** a complete artifact is validated
- **THEN** `review_outline.topic_importance` is present
- **AND** `review_outline.writing_strategies` contains at least one strategy
- **AND** `review_outline.recommended_strategy_id` references an existing
  strategy id
- **AND** strategy `source_paper_refs` reference existing source papers
### Requirement: Coverage section



The topic synthesis artifact SHALL store coverage as a minimal section without
runtime-generated duplicate summary fields.

#### Scenario: Apply-ready coverage artifact

- **WHEN** split finalize materializes `result/sections/coverage.json`
- **THEN** the section contains `coverage_verdict`, `coverage_reason`,
  `coverage_caveats`, `external_context_summary`, and
  `suggested_collection_directions`
- **AND** the section does not contain `route_coverage_summary`,
  `claim_coverage_summary`, `timeline_coverage_summary`,
  `reliability_summary`, or `external_literature`
- **AND** artifact validation accepts the minimal coverage section as complete
