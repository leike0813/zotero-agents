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

#### Scenario: Markdown export is produced

- **WHEN** a completed topic synthesis run returns its final bundle
- **THEN** create and full-update bundles MAY reference a Markdown export through
  `markdown_path`
- **AND** update-patch bundles SHALL NOT depend on `markdown_path`
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

