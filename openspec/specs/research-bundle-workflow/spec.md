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
- **AND** every available v2 digest, references, citation-analysis, and conversation payload SHALL be decoded and stored with provenance
- **AND** core papers SHALL additionally prefer source Markdown with local images, then PDF, and otherwise record a warning.

#### Scenario: Product registration succeeds

- **WHEN** all required Product assets are copied
- **THEN** README, nested manifest, topic reports, paper metadata, source files, and payload files SHALL be registered under stable product-relative paths
- **AND** the nested manifest SHALL record sizes and SHA-256 values without hashing itself.
