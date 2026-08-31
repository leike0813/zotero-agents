# research-bundle-workflow Specification

## Purpose
Define the automatic Topic-first discovery, semantic assessment, bounded selection, and auditable Research Product contract for `export-research-bundle`.
## Requirements
### Requirement: Research bundle workflow is discoverable

The system SHALL provide a core SkillRunner workflow named `export-research-bundle` that requires no Zotero selection.

#### Scenario: Workflow parameters are displayed

- **WHEN** the workflow is configured
- **THEN** `paperTitle` and `researchContent` SHALL be required
- **AND** `articleType` SHALL use the `manuscript-literature-framing` free-string contract and `original research` default
- **AND** no language parameter SHALL be present
- **AND** `maxTopics` SHALL default to 5 and accept integers from 0 through 10
- **AND** `maxCorePapers` SHALL default to 20 and accept integers from 1 through 50
- **AND** `maxRelatedPapers` SHALL default to 80 and accept integers from 1 through 200.

### Requirement: Agent selects bounded research material

The skill SHALL automatically select related Topics and papers from current Synthesis and Zotero read surfaces while preserving SQLite as the execution source of truth. Research Bundle SHALL apply semantic relevance and Topic-mandatory eligibility before intrinsic quality affects selection rank.

#### Scenario: Skill instructions are independently executable

- **WHEN** an automatic runner loads the skill package
- **THEN** `SKILL.md` SHALL directly define its input, gate loop, canonical stages, agent-authored payloads, recovery behavior, and final output contract
- **AND** an agent SHALL NOT need a separate runtime, discovery, or paper-assessment reference to complete the normal workflow
- **AND** runner metadata SHALL point to `SKILL.md` rather than hiding additional stage rules in its prompt.

#### Scenario: Graph cache is usable

- **WHEN** selected candidates and current graph metrics are available
- **THEN** the skill SHALL select bounded related and core sets using the declared weighted policy
- **AND** core papers SHALL be a subset of related papers.

#### Scenario: Discovery is executed

- **WHEN** the automatic skill runs
- **THEN** its runtime SHALL page current Topic inventory before Topic assessment
- **AND** SHALL collect every canonical paper from each selected Topic's current `source_papers` before executing the persisted Zotero metadata-anchor plan
- **AND** SHALL page each executed anchor within declared per-anchor and global discovery budgets
- **AND** SHALL execute an anchor's persisted fallback anchors only when its primary anchor yields no canonical candidate
- **AND** SHALL merge Topic and library candidates by `paper_ref` before creating paper-local assessment packets.

#### Scenario: Graph evidence is collected

- **WHEN** graph or reference evidence is available for an existing candidate
- **THEN** the runtime MAY use it for diagnostics, assessment evidence, or score derivation
- **AND** a graph neighbor SHALL NOT enter the candidate set unless the same paper was declared by a selected Topic's current `source_papers` or bounded library discovery.

#### Scenario: Selection is rendered

- **WHEN** all semantic assessment packets are valid
- **THEN** the runtime SHALL derive Topic coverage, graph availability and importance, material readiness, `selection_score`, stable order, and role from persisted evidence
- **AND** core papers SHALL be the highest-scoring bounded prefix of the related set
- **AND** the agent SHALL NOT supply graph state, readiness, `selection_score`, or role.

#### Scenario: Topic or graph context is incomplete

- **WHEN** a selected Topic context cannot expose a valid non-empty current `source_papers` table or current graph metrics are unavailable
- **THEN** graph-independent selection MAY continue with structured diagnostics when candidate discovery produces at least one reliable candidate
- **AND** valid paper refs from other selected Topics SHALL remain eligible
- **AND** an incomplete Topic source table SHALL NOT be treated as evidence that the Topic contains no papers.

#### Scenario: Candidate discovery is auditable

- **WHEN** Stage 40 finishes collecting Topic and library candidates
- **THEN** the runtime SHALL persist whether discovery is `ready`, `empty_confirmed`, or `incomplete`
- **AND** SHALL preserve stable counts for planned and executed anchors, pages, raw rows, accepted candidates, dropped rows, source failures, source truncation, candidate-budget truncation, and incomplete Topic source tables
- **AND** every accepted candidate SHALL retain its Topic or query provenance.

#### Scenario: Degraded Topic discovery finds candidates

- **WHEN** at least one selected Topic context is unavailable or its current `source_papers` table is missing, malformed, empty, or contains an invalid paper ref
- **AND** another selected Topic or bounded library discovery produces at least one reliable canonical candidate
- **THEN** Stage 40 SHALL persist `ready` and continue to Stage 50
- **AND** SHALL preserve a stable Topic-scoped runtime diagnostic for each incomplete source.

#### Scenario: Candidate discovery is incomplete

- **WHEN** every available source fails, a required response is malformed, a non-empty response yields no canonical identity, or degraded Topic discovery finishes without a reliable candidate
- **THEN** Stage 40 SHALL remain incomplete with a stable diagnostic
- **AND** Stage 50 SHALL NOT be skipped or marked complete
- **AND** the workflow SHALL NOT emit a business cancellation.

#### Scenario: Confirmed discovery is empty

- **WHEN** every required discovery source completes with a valid, explicitly empty result
- **AND** no selected Topic has an unavailable, missing, malformed, empty, or partially invalid current source-paper table
- **THEN** the runtime MAY advance without an assessment packet
- **AND** SHALL record Stage 50 as skipped because discovery was `empty_confirmed`, rather than as a completed zero-item assessment.

#### Scenario: A remote artifact bundle is required

- **WHEN** Host Bridge returns a bridge-download delivery contract
- **THEN** the current stage SHALL remain incomplete
- **AND** the gate SHALL expose the delivery instructions and resume the same stage after the declared manifest is unpacked.

#### Scenario: Execution resumes

- **WHEN** the process or agent context is restarted
- **THEN** SQLite and action receipts SHALL determine the same next gate action
- **AND** read-only views SHALL NOT be treated as writable state.

#### Scenario: No related literature is found

- **WHEN** discovery is `empty_confirmed`, or every assessed non-Topic candidate misses the related-literature threshold while no selected Topic contributes a valid source paper
- **THEN** the workflow SHALL return `research_bundle_canceled` with reason `no_related_literature`
- **AND** SHALL NOT register a Product.

#### Scenario: Graph metrics are available
- **WHEN** an eligible paper has graph metrics
- **THEN** `selection_score` SHALL combine semantic relevance 0.50, quality prior 0.15, graph 0.15, Topic coverage 0.15, and material readiness 0.05.

#### Scenario: Graph metrics are unavailable
- **WHEN** an eligible paper lacks graph metrics
- **THEN** graph weight SHALL return to semantic relevance, making semantic relevance 0.65.

#### Scenario: Optional candidate misses relevance threshold
- **WHEN** a non-Topic candidate has semantic relevance below `0.45`
- **THEN** quality SHALL NOT make it eligible.

### Requirement: Research Bundle records auditable quality selection

Each selected paper SHALL record four-artifact manifest state, a literature-quality snapshot, every selection component, and `selection_score` under `research_bundle.selection` `2.0.0`.

#### Scenario: Score is unavailable
- **WHEN** literature score is missing or invalid
- **THEN** quality prior SHALL be neutral
- **AND** the stable score diagnostic SHALL be preserved.

### Requirement: Research Product contains auditable materials

The workflow SHALL register one compact, read-only Research Bundle Product rather than a Zotero migration archive. Canonical paper materialization rules for portable metadata, Markdown-or-PDF source selection, safe Markdown images, and the four analysis artifact types SHALL be shared with direct research-bundle export, while workflow selection, role, bibliography, Topic, Product layout, and registration semantics remain owned by the workflow.

#### Scenario: Related and core materials are materialized

- **WHEN** a valid selection is applied
- **THEN** every related paper SHALL have portable metadata
- **AND** `references.bib` SHALL contain the successfully materialized core and related Zotero items
- **AND** bibliography export SHALL prefer Better BibTeX and fall back to Zotero BibTeX when Better BibTeX is unavailable, fails, or returns empty output
- **AND** every available digest, references, citation-analysis, and literature-score payload SHALL be decoded and stored with provenance
- **AND** ordinary notes and conversation-note payloads SHALL NOT be exported
- **AND** core papers SHALL additionally contain at most one source, preferring Markdown with eligible local images and falling back to PDF.

#### Scenario: Shared materialization is used by a Product

- **WHEN** the workflow consumes shared paper materialization output
- **THEN** its existing `research_bundle.product` schema, core/related paths, bibliography, index, README, warnings, and atomic Product registration behavior SHALL remain unchanged.

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
- **THEN** README, manifest, `references.bib`, Topic reports, paper metadata, core source files, four analysis payload types, and eligible source images SHALL be registered under stable Product-relative paths
- **AND** the manifest SHALL use `schema_id` `research_bundle.product` and `schema_version` `2.0.0`
- **AND** the manifest SHALL include a top-level `bibliography` record as the bibliography provenance source of truth
- **AND** the manifest SHALL record sizes and SHA-256 values without hashing itself.

#### Scenario: README tables remain machine-parseable

- **WHEN** the Research Bundle README is generated
- **THEN** each Topic and paper index header SHALL have a matching delimiter cell for every column
- **AND** a standard Markdown table parser SHALL recognize both indexes as tables.

### Requirement: Topic-resolved papers are mandatory candidates

The Research Bundle runtime SHALL read each selected Topic's current semantic context, include every unique canonical `paper_ref` from its persisted `source_papers` before library search, and preserve those papers through candidate assessment and final selection unless the host cannot materialize the referenced Zotero item.

#### Scenario: Topic paper has low semantic relevance

- **WHEN** a selected Topic declares a source paper whose Stage 50 semantic relevance is below `0.45`
- **THEN** the paper remains eligible and is normalized into the final `papers` array
- **AND** its Topic association is recorded in the selection/audit data.

#### Scenario: Search and Topic results overlap

- **WHEN** a paper is returned by library search and by one or more selected Topics
- **THEN** it appears once, keyed by `paper_ref`
- **AND** its sources and Topic ids are merged.

#### Scenario: Topic context precedes library search

- **WHEN** at least one Topic is selected
- **THEN** every selected Topic semantic context SHALL be read and its valid current source papers persisted before the first library search request is executed.

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

### Requirement: Workflow number inputs enforce their declared contract

Live Workflow parameter forms SHALL expose and enforce declared integer and range constraints before accepting a value.

#### Scenario: Bounded count is rendered

- **WHEN** a number parameter declares finite minimum and maximum values
- **THEN** each live Workflow parameter form SHALL append that range to the localized parameter label
- **AND** SHALL expose the same bounds through the number input attributes.

#### Scenario: Invalid count is entered

- **WHEN** a user enters a non-finite, fractional, below-minimum, or above-maximum value for an integer parameter
- **THEN** the form SHALL reject confirmation or automatic persistence
- **AND** SHALL preserve the previously valid stored value.

#### Scenario: Non-UI caller exceeds a Research Bundle limit

- **WHEN** a non-UI caller supplies a numeric Research Bundle limit outside its declared range
- **THEN** the Skill runtime SHALL clamp the value to the corresponding schema boundary.

### Requirement: Research Bundle materialization SHALL return immutable run-scoped resources

`researchBundles.materializePapers` SHALL resolve bounded portable paper refs, preserve first-selection order, materialize the canonical paper artifacts and source graph, and return immutable run-scoped resource references plus closed issues. It MUST NOT return live attachment paths as resource identity.

#### Scenario: Paper has Markdown images and a PDF
- **WHEN** materialization resolves an eligible paper with both sources
- **THEN** the result contains portable paper metadata, a validated source graph, and resources whose bytes remain fixed for the run

### Requirement: Research Bundle import SHALL own the complete graph write

`researchBundles.importPapers` SHALL validate the entire portable paper graph, resolve explicit create/existing targets, compute strongly connected consistency groups, schedule dependency-ready groups, create or reuse targets, stage resources, bind relations after targets exist, and report one bounded result per paper. The caller MUST NOT orchestrate equivalent low-level writes.

#### Scenario: Acyclic dependency chain imports
- **WHEN** paper B depends on paper A and both validate
- **THEN** the owner establishes A before B and binds their relation only after both target identities exist

#### Scenario: Cycle forms one consistency group
- **WHEN** several paper nodes form a strongly connected component
- **THEN** the owner treats them as one consistency group for commit, compensation, and result reporting

### Requirement: Import target mapping SHALL be explicit and non-destructive

Each paper SHALL declare whether it creates a new target or reuses an existing portable target. Existing targets SHALL be validated and reused without metadata, type, creator, tag, collection, relation, note, or attachment mutation except effects explicitly named by the request contract.

#### Scenario: Existing target is reused
- **WHEN** a paper maps to an existing regular item
- **THEN** import attaches only explicitly requested child resources and relations and does not rewrite the existing parent metadata

#### Scenario: Caller omits target mapping
- **WHEN** an import row provides neither a valid create target nor a valid existing target
- **THEN** validation fails without guessing from DOI, title, file hash, or library search

### Requirement: Import partial success SHALL preserve group consistency

Independent consistency groups MAY succeed when another group fails, but no result SHALL report success for a group whose required targets or resources are incomplete. Failed, canceled, unknown, and repair-required rows SHALL reference canonical attempt evidence without copying an open error bag.

#### Scenario: Independent group fails
- **WHEN** one consistency group fails before affecting another dependency-independent group
- **THEN** the independent group may commit and both groups receive explicit per-paper outcomes

#### Scenario: Compensation leaves residue
- **WHEN** a failed group cannot remove all newly created items or managed resources
- **THEN** affected rows report `repair_required` with bounded residual evidence and unaffected committed groups remain valid

### Requirement: Import SHALL not resume after process restart

Research Bundle import operation state and run-scoped resources SHALL be process-scoped. After Host restart, a caller MUST inspect current Zotero state and submit a new operation rather than resuming a prior graph scheduler.

#### Scenario: Host restarts after ambiguous import
- **WHEN** an import attempt has `unknown` outcome and the Host restarts
- **THEN** the caller performs reconciliation and cannot replay the old operation identity or resource handles
