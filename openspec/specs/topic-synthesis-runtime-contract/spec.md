## Purpose

The topic synthesis runtime validates fixed-path final artifacts and required sidecar proposals before formal output.
## Requirements
### Requirement: Final artifacts are file-authored and validated



Final topic synthesis sections and sidecars SHALL be authored as fixed-path
files and then indexed by runtime-generated manifests.

#### Scenario: Final manifest lists sidecars

- **WHEN** `validate_final_artifacts` runs
- **THEN** it SHALL generate `result/topic-analysis.json` or
  `result/topic-analysis.patch.json`
- **AND** the manifest SHALL contain a `sidecars` object with
  `topic_interest_metadata`, `concept_cards_proposal`, and
  `topic_graph_relation_proposals`
- **AND** each sidecar entry SHALL include `path`, `hash`, `content_type`, and
  `schema_id` from the registered artifact.
### Requirement: Runtime validates KG proposal sidecars before final render



The topic synthesis runtime SHALL validate and register KG proposal sidecars
before final artifact validation.

#### Scenario: KG proposal payload is persisted

- **WHEN** `persist_kg_proposals` receives a valid combined KG proposal payload
- **THEN** runtime SHALL write concept cards to
  `result/sidecars/concept-cards-proposal.json`
- **AND** write topic graph relation proposals to
  `result/sidecars/topic-graph-relation-proposals.json`
- **AND** write topic interest metadata to
  `result/sidecars/topic-interest-metadata.json`
- **AND** register all three artifacts with hashes.

#### Scenario: Final validation runs without required sidecars

- **WHEN** `validate_final_artifacts` runs for a completed create/update result
  and any required sidecar is missing or hash-mismatched
- **THEN** runtime SHALL reject final validation before writing
  `result/result.json`.
### Requirement: Runtime prepares cross-paper context deterministically



The topic synthesis runtime SHALL prepare cross-paper contexts and provenance
without requiring an agent-authored cross-paper evidence map.

#### Scenario: Context preparation runs

- **WHEN** Stage 5 paper triage is complete
- **THEN** runtime SHALL compute deterministic paper scores from relevance,
  quality, artifact availability, and graph role hints
- **AND** it SHALL generate separate `core_analysis` and `external_literature`
  context selections.

#### Scenario: Calibrated context constants are used

- **WHEN** runtime computes full-context slot counts
- **THEN** it SHALL use the calibrated constants from
  `artifact/synthesis-agent-payload-simplification-notes.md`
- **AND** those constants SHALL include `core_analysis_full_context_tokens_per_paper: 1500`,
  `external_literature_full_context_tokens_per_paper: 7750`, and
  `safety_margin_ratio: 0.10`.

#### Scenario: Provenance index is generated

- **WHEN** runtime writes cross-paper context views
- **THEN** it SHALL also write a source paper evidence/provenance index
- **AND** it SHALL NOT label the runtime-only index as an agent-authored
  semantic evidence map.
### Requirement: Runtime derives final evidence structures from source paper refs



The runtime SHALL materialize paper evidence, evidence refs, and semantic
evidence maps from validated section `source_paper_refs`.

#### Scenario: Section references source papers

- **WHEN** a validated section object contains `source_paper_refs`
- **THEN** runtime SHALL validate each ref against the resolved paper set
- **AND** it SHALL derive stable evidence refs for the final artifact.

#### Scenario: Semantic evidence map is produced

- **WHEN** final artifact materialization runs
- **THEN** runtime SHALL compile `semantic_evidence_map` from Stage 7/8/10
  section contents
- **AND** it SHALL NOT use a Stage 6 placeholder as the semantic map source.
### Requirement: Runtime derives timeline markers



Runtime SHALL derive timeline rendering markers from paper evidence, timeline
events, and paper metadata.

#### Scenario: Timeline event cites papers

- **WHEN** an agent-authored timeline event contains `source_paper_refs`
- **THEN** runtime SHALL derive milestone markers for those papers
- **AND** marker `kind`, year, paper evidence id, and event id SHALL be
  runtime-derived.

#### Scenario: Paper is not promoted to milestone

- **WHEN** a resolved paper has bibliographic year metadata but is not cited by
  a timeline event
- **THEN** runtime MAY derive a paper marker
- **AND** it SHALL deduplicate markers by paper evidence id.
### Requirement: Runtime materializes KG sidecars



The topic synthesis runtime SHALL turn KG enrichment payloads into the required
main-path sidecar artifacts.

#### Scenario: KG enrichment is validated

- **WHEN** Stage 9 enrichment passes validation
- **THEN** runtime SHALL write `concept-cards-proposal.json`,
  `topic-graph-relation-proposals.json`, and
  `topic-interest-metadata.json`
- **AND** it SHALL derive sidecar wrapper fields, ids, seed literature item ids,
  topic ids, and schema metadata.
### Requirement: Runtime materializes statistics and synthesis report



Runtime SHALL generate lightweight statistics needed by Topic Details from
runtime-owned artifacts.

#### Scenario: Source paper time span is materialized

- **WHEN** finalize writes the complete topic sections
- **THEN** `source_papers[].year` SHALL be populated when a year is available
  from the resolved workset or paper artifact metadata
- **AND** `statistics.time_span` SHALL contain the earliest and latest
  available source paper years.
### Requirement: Runtime writes a candidate final output



The skill runtime SHALL not directly write the accepted final
`result/result.json` file.

#### Scenario: Final validation succeeds

- **WHEN** `validate_final_artifacts` succeeds
- **THEN** runtime SHALL write `result/final-output.candidate.json`
- **AND** the candidate file SHALL be a runner-facing envelope containing
  `__SKILL_DONE__: true`
- **AND** the orchestrator SHALL be responsible for validating stdout and
  writing accepted `result/result.json`.
### Requirement: Split finalize materializes complete topic synthesis output


The split topic synthesis finalize runtime SHALL render
`result/sections/synthesis_report.json.body` as the canonical Markdown report
from the complete structured section set.

#### Scenario: Finalize renders the canonical report body

- **WHEN** finalize completes a create or update-full topic synthesis run
- **THEN** `result/sections/synthesis_report.json` SHALL contain a `body` string
  rendered from topic, taxonomy, timeline, claims, improvement dimensions,
  debates, future directions, review outline, coverage, summary, and
  source_papers sections
- **AND** source paper references in the body SHALL use stable bibliography
  numbers derived from `source_papers[]`
- **AND** source paper references before the bibliography SHALL be Markdown
  links to bibliography anchors
- **AND** each bibliography item SHALL define a stable `ref-n` anchor before its
  plain bracketed number
- **AND** the body SHALL NOT be a JSON envelope or runtime diagnostic text.
