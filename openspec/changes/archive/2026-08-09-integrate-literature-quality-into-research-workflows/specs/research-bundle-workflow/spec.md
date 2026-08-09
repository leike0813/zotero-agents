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
- **AND** SHALL collect every resolved paper from selected Topics before executing the persisted Zotero library queries
- **AND** SHALL merge Topic and library-search candidates by `paper_ref` before creating paper-local assessment packets.

#### Scenario: Graph evidence is collected

- **WHEN** graph or reference evidence is available for an existing candidate
- **THEN** the runtime MAY use it for diagnostics, assessment evidence, or score derivation
- **AND** a graph neighbor SHALL NOT enter the candidate set unless the same paper was resolved by a selected Topic or library search.

#### Scenario: Selection is rendered

- **WHEN** all semantic assessment packets are valid
- **THEN** the runtime SHALL derive Topic coverage, graph availability and importance, material readiness, `selection_score`, stable order, and role from persisted evidence
- **AND** core papers SHALL be the highest-scoring bounded prefix of the related set
- **AND** the agent SHALL NOT supply graph state, readiness, `selection_score`, or role.

#### Scenario: Topic or graph context is incomplete

- **WHEN** a selected Topic context cannot expose a resolved paper set or current graph metrics are unavailable
- **THEN** selection SHALL continue with diagnostics and the remaining Topic and library candidates without creating or updating Synthesis state
- **AND** a valid empty Topic paper set SHALL remain distinct from an unavailable or malformed response.

#### Scenario: A remote artifact bundle is required

- **WHEN** Host Bridge returns a bridge-download delivery contract
- **THEN** the current stage SHALL remain incomplete
- **AND** the gate SHALL expose the delivery instructions and resume the same stage after the declared manifest is unpacked.

#### Scenario: Execution resumes

- **WHEN** the process or agent context is restarted
- **THEN** SQLite and action receipts SHALL determine the same next gate action
- **AND** read-only views SHALL NOT be treated as writable state.

#### Scenario: No related literature is found

- **WHEN** no candidate meets the related-literature threshold and no selected Topic resolves a paper
- **THEN** the workflow SHALL return a business cancellation
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
