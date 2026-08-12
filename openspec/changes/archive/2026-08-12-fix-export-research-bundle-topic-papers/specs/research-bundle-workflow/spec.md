## MODIFIED Requirements

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
