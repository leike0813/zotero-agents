# topic-synthesis-structured-artifact Specification

## Purpose
TBD - created by archiving change redesign-topic-synthesis-structured-artifact. Update Purpose after archive.
## Requirements
### Requirement: Topic synthesis has a structured canonical artifact

Topic synthesis SHALL have a structured JSON artifact as its display and reuse
source of truth, while Markdown remains a compatibility export.

#### Scenario: Complete section manifest is produced

- **WHEN** a completed topic synthesis run returns its final bundle
- **THEN** the bundle SHALL reference a section manifest such as
  `topic-analysis.json`
- **AND** the manifest SHALL reference section files for topic, summary, claims,
  timeline events, paper evidence, external literature analysis, coverage, gaps,
  source artifacts, and diagnostics
- **AND** the assembled structured artifact SHALL declare
  `schema_id: "synthesis.topic_synthesis_artifact"`
- **AND** the assembled structured artifact SHALL include topic, summary, claims,
  timeline events, paper evidence, external literature analysis, coverage, gaps,
  source artifacts, diagnostics, and language.

#### Scenario: Section patch is produced

- **WHEN** an update run returns `operation: "update_patch"`
- **THEN** the bundle SHALL reference a
  `synthesis.topic_section_patch_manifest`
- **AND** the patch manifest SHALL use section replacement semantics rather
  than JSON Patch, JSON Merge Patch, or field/path-level edits
- **AND** it SHALL include the target topic id, language, changed section names,
  changed section file paths, read section hashes, replacement section hashes,
  update reason, and diagnostics
- **AND** replacement section hashes SHALL be a subset of read section hashes
- **AND** the plugin SHALL materialize a complete structured artifact before
  persistence.

#### Scenario: Language is selected

- **WHEN** a topic synthesis run receives a language parameter
- **THEN** the structured artifact SHALL record the resolved language
- **AND** user-facing prose fields SHALL use that language
- **AND** stable ids, refs, hashes, payload types, and schema keys SHALL remain
  language-neutral.

#### Scenario: Paper evidence references original digest artifacts

- **WHEN** a paper evidence entry corresponds to a resolved library paper with an
  available digest
- **THEN** the entry SHALL include a host-resolvable `digest_ref`
- **AND** `digest_ref` SHALL identify the original `digest-markdown` payload
  using stable locator/provenance fields such as paper ref, item ref, note key,
  payload type, payload hash, and source timestamp when available
- **AND** the structured topic artifact SHALL NOT duplicate the full
  `digest-markdown` body.

#### Scenario: Host Markdown export is produced

- **WHEN** a completed topic synthesis run returns its final bundle
- **THEN** the run-workspace final bundle and section manifest SHALL NOT depend
  on `markdown_path`, `preview.md`, or `export.md`
- **AND** the host SHALL render canonical `current/export.md` from the
  materialized structured artifact
- **AND** Markdown SHALL NOT be treated as the structured display source of
  truth.

#### Scenario: Canonical current directory is materialized

- **WHEN** the host persists a validated topic synthesis artifact
- **THEN** the topic canonical directory SHALL use `current/manifest.json`,
  `current/metadata.json`, `current/artifact.json`, `current/export.md`, and
  `current/sections/*.json`
- **AND** `current/manifest.json` plus `current/sections/*.json` SHALL be the
  structured source of truth
- **AND** `current/artifact.json` and `current/export.md` SHALL be deterministic
  materialized outputs derived from the manifest sections.

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
  `result/result.json`
- **AND** update patch writes `result/topic-analysis.patch.json` and
  `result/result.json`
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

