## MODIFIED Requirements

### Requirement: Literature analysis SHALL route by generated-note readiness

The workflow SHALL derive one internal mode from the selected parent's canonical managed artifacts without exposing `score_only` as a workflow parameter. Readiness SHALL use the shared semantic classifier and Broker detail contract; heading text, legacy wrapper aliases, or guessed content SHALL not establish artifact presence.

#### Scenario: Complete recognized analysis triplet needs only a score
- **GIVEN** digest, References, and Citation artifacts are recognized as valid by the shared classifier
- **AND** no valid literature-score payload is present
- **WHEN** literature-analysis builds its request
- **THEN** it SHALL run the Skill with `score_only: true`
- **AND** it SHALL omit tag-regulator.

#### Scenario: Any analysis artifact is absent
- **GIVEN** at least one of digest, References, or Citation is absent, invalid, or stale for the requested mode
- **WHEN** literature-analysis builds its request
- **THEN** it SHALL run with `score_only: false`
- **AND** it MAY include tag-regulator according to the public option.

#### Scenario: Generated-note headings have no canonical artifact evidence
- **GIVEN** notes contain generated headings but no valid canonical payload or recognized managed detail
- **WHEN** literature-analysis builds its request
- **THEN** those notes SHALL be treated as absent
- **AND** the workflow SHALL not read a legacy wrapper as a fallback.

#### Scenario: Generated-note headings have no artifact evidence
- **GIVEN** notes contain generated-artifact headings but no valid canonical payload or managed detail
- **WHEN** literature-analysis builds its request
- **THEN** those notes SHALL be treated as absent
- **AND** it SHALL run with `score_only: false`.

#### Scenario: All four artifacts are available
- **GIVEN** the recognized analysis triplet and a valid literature-score payload are present
- **WHEN** workflow availability or request construction is evaluated
- **THEN** the parent item SHALL be rejected as an input.

#### Scenario: Marked score note has an invalid payload
- **GIVEN** the recognized analysis triplet is present and the score note is damaged or undecodable
- **WHEN** readiness is evaluated
- **THEN** the score SHALL be treated as unavailable
- **AND** the workflow SHALL remain available in score-only mode.

### Requirement: Literature analysis apply SHALL honor the submitted mode

Literature analysis apply SHALL use the mode captured by the submitted request and SHALL route every artifact write through the canonical managed-note owner. A full result SHALL use one trusted parent-set write for References and Citation, preserving explicit source identities and deriving the resulting basis at commit.

#### Scenario: Score-only result is applied
- **WHEN** a score-only request succeeds
- **THEN** apply SHALL read only the score artifact path
- **AND** it SHALL create or update only the literature-score managed note
- **AND** it SHALL ignore digest, References, and Citation paths.

#### Scenario: Full result is applied
- **WHEN** a full request succeeds
- **THEN** apply SHALL validate and write digest, References, Citation, and score artifacts through their canonical operations
- **AND** References/Citation SHALL be committed in one parent-set Zotero transaction with one identity and one durable receipt.

#### Scenario: Legacy result has no score path
- **WHEN** a new workflow apply receives a result without `literature_score_path`
- **THEN** apply SHALL reject the result and require a new run
- **AND** it SHALL not synthesize a score from headings or legacy aliases.

### Requirement: Literature Workbench workflows SHALL use only v12 owner modules

Literature Workbench, MinerU, Synthesis-layer, and workflow-debug consumers SHALL use the named v12 library, metadata, mutation, managed-note, image, attachment, bibliography, research-bundle, status-tag, file, archive, resource, UI, logging, and grouped Synthesis members. They MUST NOT access raw items, handlers, globals, filesystem adapters, warning bags, package-local reference aliases, or flat Synthesis shapes.

#### Scenario: Tag auditor scans a library
- **WHEN** tag auditing runs under v12
- **THEN** it combines `library.traverseItems` with `synthesis.tags.withAuditRun`
- **AND** it promotes only completed traversal evidence.

#### Scenario: Tag regulator clears an audit row
- **WHEN** a tag regulation mutation returns a confirmed receipt
- **THEN** the workflow calls `synthesis.tags.acknowledgeRegulation` with that receipt
- **AND** it does not invoke a flat handler-shaped clear method.

#### Scenario: Research bundle imports papers
- **WHEN** a Workbench workflow applies a portable Research Bundle
- **THEN** it delegates the graph to `researchBundles.importPapers`
- **AND** it does not sequence raw parent, attachment, relation, and note handlers.

#### Scenario: Literature analysis writes a managed artifact
- **WHEN** a Workbench step applies digest, References, Citation, score, custom, or conversation content
- **THEN** it calls the corresponding semantic owner operation
- **AND** it does not keep a package-local list/create/update/duplicate-cleanup orchestration or reference alias normalizer.

### Requirement: Workflow partial outcomes SHALL consume structured evidence

Built-in workflows SHALL map committed, unchanged, failed, canceled, unknown, and repair-required attempts to their own user-facing or product partial outcomes. They MUST NOT infer success from missing exceptions, warning arrays, or the presence of an intermediate note.

#### Scenario: Status transition fails after primary artifact succeeds
- **WHEN** a workflow has a valid primary artifact and the status-tag transition returns a failed attempt
- **THEN** the workflow SHALL preserve the primary result
- **AND** it SHALL report the structured partial diagnostic rather than silently succeeding.

## ADDED Requirements

### Requirement: Managed artifact application SHALL use one trusted parent-set writer

Any trusted workflow result containing a References/Citation pair SHALL be validated, staged, and committed as one parent-set operation. The writer SHALL verify the parent, note revisions, source IDs, and computed References basis before the same Zotero transaction commits both artifacts. Public workflow APIs SHALL not expose a two-call composition that permits an observable half-pair.

#### Scenario: Citation write fails validation
- **WHEN** a full workflow result has an invalid Citation ID or basis
- **THEN** preflight SHALL fail before either References or Citation is written
- **AND** the result SHALL contain one structured failed attempt.

#### Scenario: Paired artifact commit succeeds
- **WHEN** both artifacts pass validation and the parent-set transaction commits
- **THEN** one durable receipt SHALL cover the pair
- **AND** downstream Synthesis SHALL observe the resulting basis as one coherent state.
