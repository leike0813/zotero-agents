## ADDED Requirements

### Requirement: Topic workflows use the Host Library / Artifact Facade as primary input

The project SHALL document topic create/update workflows as consuming a Host Bridge library/artifact facade over Zotero items and artifact notes, not as consuming committed registry cache rebuild output as their primary source.

#### Scenario: Create topic resolves a workset

- **WHEN** a topic create workflow needs candidate papers and artifact content
- **THEN** the documented primary inputs are `get-library-index`, `resolve-resolver`, and `export-filtered-paper-artifacts`
- **AND** registry cache rebuild completion is not documented as a prerequisite.

#### Scenario: Update topic loads current base state

- **WHEN** a topic update workflow starts
- **THEN** it reads current topic context through the Host Bridge Synthesis facade
- **AND** any resolver/workset refresh uses the same library/artifact facade boundary.

### Requirement: Registry cache changes do not drive topic artifact lifecycle

The project SHALL document registry cache incremental updates, startup reconcile, and registry/graph cache rebuild as maintaining registry and citation graph state without normally enqueueing topic freshness, discovery, or update jobs.

#### Scenario: Registry/graph cache rebuild completes

- **WHEN** a registry/graph cache rebuild finishes
- **THEN** topic artifacts remain unchanged
- **AND** the rebuild does not create topic freshness or discovery work by default.

#### Scenario: New literature enters registry cache

- **WHEN** a Zotero item enters the registry cache or a registry row changes
- **THEN** existing topics are not marked stale by that registry event alone
- **AND** topic update remains an explicit workflow action.

### Requirement: Topic source checks are explicit diagnostics

The project SHALL document topic source freshness as an explicit source-check diagnostic rather than a continuously maintained background invariant.

#### Scenario: User checks topic sources

- **WHEN** a user explicitly runs a source check for a topic
- **THEN** the check may compare the topic source manifest against current Host Library / Artifact Facade output
- **AND** the result is diagnostic until the user chooses to run a topic update workflow.

#### Scenario: Digest artifact is rerun or deleted

- **WHEN** a digest artifact changes outside an explicit topic update
- **THEN** the target contract does not require a background topic stale event
- **AND** the change can be detected by the next explicit source check.

### Requirement: Citation Graph metrics are optional topic enrichment

The project SHALL document citation graph metrics as optional enrichment for topic synthesis, not required evidence and not a topic workflow precondition.

#### Scenario: Citation graph metrics are missing

- **WHEN** topic create/update cannot read citation graph metrics or receives stale/empty metrics
- **THEN** the workflow may record diagnostics
- **AND** it must not treat missing metrics as a blocker for topic synthesis.

### Requirement: Discovery remains separate from topic artifact lifecycle

The project SHALL document discovery hints as optional best-effort hints that do not mutate topic artifacts or create registry-cache-driven topic update work.

#### Scenario: Discovery hint is accepted

- **WHEN** a user accepts a discovery hint
- **THEN** the documented next step is explicit topic update flow
- **AND** the hint itself does not rewrite topic artifact text, resolver, or topic graph relations.
