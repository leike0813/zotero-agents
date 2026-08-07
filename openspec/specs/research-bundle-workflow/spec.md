# research-bundle-workflow Specification

## Purpose
TBD - created by syncing change add-export-research-bundle-workflow. Update Purpose after archive.
## Requirements
### Requirement: Research bundle workflow is discoverable

The system SHALL provide a core SkillRunner workflow named `export-research-bundle` that requires no Zotero selection.

#### Scenario: Workflow parameters are displayed

- **WHEN** the workflow is configured
- **THEN** `paperTitle` and `researchContent` SHALL be required
- **AND** `articleType` SHALL use the `manuscript-literature-framing` free-string contract and `original research` default
- **AND** no language parameter SHALL be present.

### Requirement: Agent selects bounded research material

The skill SHALL automatically select related topics and papers from current Synthesis and Zotero read surfaces.

#### Scenario: Skill instructions are independently executable

- **WHEN** an automatic runner loads the skill package
- **THEN** `SKILL.md` SHALL directly define its input, gate loop, canonical stages, agent-authored payloads, recovery behavior, and final output contract
- **AND** an agent SHALL NOT need a separate runtime, discovery, or paper-assessment reference to complete the normal workflow
- **AND** runner metadata SHALL point to `SKILL.md` rather than hiding additional stage rules in its prompt.

#### Scenario: Graph cache is usable

- **WHEN** semantic candidates and current graph metrics are available
- **THEN** the skill SHALL select bounded related and core sets using the declared weighted policy
- **AND** core papers SHALL be a subset of related papers.

#### Scenario: Discovery is executed

- **WHEN** the automatic skill runs
- **THEN** its runtime SHALL page current Topic and graph collections and execute bounded Zotero library queries through Host Bridge
- **AND** SHALL merge Topic source papers, library search results, and Zotero-backed graph neighbors into a bounded candidate workset
- **AND** SHALL expose paper-local assessment packets rather than asking the agent to author a final selection manifest.

#### Scenario: Selection is rendered

- **WHEN** all semantic assessment packets are valid
- **THEN** the runtime SHALL derive Topic coverage, graph availability and importance, material readiness, score, stable order, and role from persisted evidence
- **AND** core papers SHALL be the highest-scoring bounded prefix of the related set
- **AND** the agent SHALL NOT supply graph state, readiness, score, or role.

#### Scenario: Topic or graph context is incomplete

- **WHEN** topic reports or current graph metrics are unavailable
- **THEN** selection SHALL degrade without creating or updating Synthesis state
- **AND** diagnostics SHALL describe the missing context and fallback scoring.

#### Scenario: A remote artifact bundle is required

- **WHEN** Host Bridge returns a bridge-download delivery contract
- **THEN** the current stage SHALL remain incomplete
- **AND** the gate SHALL expose the delivery instructions and resume the same stage after the declared manifest is unpacked.

#### Scenario: Execution resumes

- **WHEN** the process or agent context is restarted
- **THEN** SQLite and action receipts SHALL determine the same next gate action
- **AND** read-only views SHALL NOT be treated as writable state.

#### Scenario: No related literature is found

- **WHEN** no candidate meets the related-literature threshold
- **THEN** the workflow SHALL return a business cancellation
- **AND** SHALL NOT register a Product.

### Requirement: Research Product contains auditable materials

The workflow SHALL register one read-only Research Bundle Product rather than a ZIP archive.

#### Scenario: Related and core materials are materialized

- **WHEN** a valid selection is applied
- **THEN** every related paper SHALL have portable metadata
- **AND** `references.bib` SHALL contain the successfully materialized core and related Zotero items
- **AND** bibliography export SHALL prefer Better BibTeX and fall back to Zotero BibTeX when Better BibTeX is unavailable, fails, or returns empty output
- **AND** every available v2 digest, references, citation-analysis, and conversation payload SHALL be decoded and stored with provenance
- **AND** core papers SHALL additionally prefer source Markdown with eligible local images, then PDF, and otherwise record a warning.

#### Scenario: Bibliography fallback succeeds

- **WHEN** Better BibTeX cannot produce the bibliography and Zotero BibTeX succeeds
- **THEN** the Product SHALL include `references.bib`
- **AND** the manifest SHALL record the requested and actual formats, translator identity, item count, and fallback status
- **AND** the manifest warnings SHALL record a stable bibliography fallback diagnostic.

#### Scenario: Every bibliography exporter fails

- **WHEN** neither Better BibTeX nor Zotero BibTeX can produce non-empty output for materialized papers
- **THEN** atomic Product registration SHALL fail.

#### Scenario: Product records v2 paths and integrity

- **WHEN** all required Product assets are copied
- **THEN** README, manifest, `references.bib`, Topic reports, paper metadata, source files, payload files, and eligible source images SHALL be registered under stable Product-relative paths
- **AND** the manifest SHALL use `schema_id` `research_bundle.product` and `schema_version` `2.0.0`
- **AND** the manifest SHALL include a top-level `bibliography` record as the bibliography provenance source of truth
- **AND** the manifest SHALL record sizes and SHA-256 values without hashing itself.

#### Scenario: README tables remain machine-parseable

- **WHEN** the Research Bundle README is generated
- **THEN** each Topic and paper index header SHALL have a matching delimiter cell for every column
- **AND** a standard Markdown table parser SHALL recognize both indexes as tables.

### Requirement: Topic-resolved papers are mandatory candidates

The Research Bundle runtime SHALL include every unique `paper_ref` found in the selected Topic `resolved_paper_set` in the candidate set and final selection unless the paper cannot be resolved by the host at materialization time.

#### Scenario: Topic paper has low semantic relevance

- **WHEN** a selected Topic resolves a paper whose Stage 50 semantic relevance is below `0.45`
- **THEN** the paper remains eligible and is normalized into the final `papers` array
- **AND** its Topic association is recorded in the selection/audit data.

#### Scenario: Search and Topic results overlap

- **WHEN** a paper is returned by library search and by one or more selected Topics
- **THEN** it appears once, keyed by `paper_ref`
- **AND** its sources and Topic ids are merged.

### Requirement: Related-paper limits exclude mandatory Topic papers

`maxRelatedPapers` SHALL limit only non-Topic-associated additional papers. `maxCorePapers` SHALL continue to limit the number of papers assigned the `core` role.

#### Scenario: Mandatory Topic papers exceed the related limit

- **WHEN** the selected Topics resolve more papers than `maxRelatedPapers`
- **THEN** all resolved Topic papers remain in the final selection
- **AND** no additional non-Topic papers are admitted once the configured related budget is filled.

### Requirement: Candidate assessment budget preserves Topic papers

The bounded candidate budget SHALL never truncate a Topic-associated candidate. Non-Topic candidates MAY be truncated deterministically after all mandatory Topic candidates are retained.

#### Scenario: Candidate budget is exceeded

- **WHEN** mandatory Topic candidates plus optional candidates exceed the assessment budget
- **THEN** all mandatory Topic candidates enter assessment packets
- **AND** only optional candidates are truncated.

### Requirement: Selection normalization accepts mandatory Topic papers

The shared selection normalizer SHALL allow low-score Topic-associated papers, preserve their Topic association, and enforce count limits only for non-Topic papers and core role count. It SHALL continue rejecting duplicate refs, invalid scores, and malformed core prefixes.

#### Scenario: Normalizer validates optional count

- **WHEN** a normalized selection contains too many non-Topic papers
- **THEN** normalization rejects it
- **AND** a selection with additional mandatory Topic papers remains valid.
