# topic-planning-workflow Specification

## Purpose

Define a repeatable library-wide planning workflow that creates and maintains lightweight topic structure before substantive topic synthesis is run.

## Requirements

### Requirement: Planning is incremental and library-wide
The planner SHALL inspect the current top-level regular-item index, every visible topic, the canonical Topic Graph, and previously stored planning metadata before proposing structural changes.

#### Scenario: Re-running without relevant change
- **WHEN** the library index, topic graph, and planning evidence still support the current structure
- **THEN** the planner reports no change and does not rewrite the graph

#### Scenario: Library content creates a coverage gap
- **WHEN** current top-level regular items are not adequately described by materialized or active planned topics
- **THEN** the planner may create or revise Planned Topics to cover that gap

### Requirement: Coverage states are explicit
Each top-level regular item SHALL receive exactly one primary coverage state: `materialized_covered`, `planned_covered`, `uncovered`, or `indeterminate`. Multi-topic overlap SHALL be reported separately and SHALL NOT replace the primary state.

#### Scenario: Paper matches multiple topics
- **WHEN** a paper is covered by more than one materialized or planned topic
- **THEN** it retains one primary coverage state and the overlap report lists all matching topics

### Requirement: Planning uses staged evidence
The planner SHALL classify from the bounded metadata index first and SHALL read literature digests only for uncovered or ambiguous batches that need deeper evidence.

#### Scenario: Metadata is sufficient
- **WHEN** title, creators, year, tags, and collections support a determinate coverage decision
- **THEN** the planner does not request the paper digest for that decision

### Requirement: Planned Topic has a reversible lifecycle
A Planned Topic SHALL have lifecycle `planned` or `stale` until the same topic is materialized. Staling SHALL preserve its identity, definition, resolver, revision, basis, and reviewed relation decisions.

#### Scenario: Planned Topic is no longer useful
- **WHEN** an incremental run finds that an active Planned Topic is obsolete
- **THEN** it marks the topic stale instead of deleting or archiving it

#### Scenario: Stale topic becomes useful again
- **WHEN** later evidence supports the same Planned Topic
- **THEN** the planner can reactivate the same topic identifier

### Requirement: Planned Topic stores definition but not provisional membership
A Planned Topic SHALL persist title, definition, aliases, include and exclude scope, resolver, revision, evidence basis, lifecycle, and planning provenance. It SHALL NOT persist a provisional paper-membership list or synthesis artifact.

#### Scenario: Planned Topic is created
- **WHEN** the planner creates a Planned Topic
- **THEN** the stored node contains its reusable definition and resolver but no resolved-paper list

### Requirement: Plan reconciliation is atomic and idempotent
The planner SHALL apply all topic actions and relation proposals in one `topic_plan/reconcile` batch guarded by the expected graph hash. Reapplying the same accepted plan SHALL be idempotent.

#### Scenario: Graph changed concurrently
- **WHEN** the supplied `base_graph_hash` differs from the current graph hash
- **THEN** the entire plan is rejected as `conflict` without partial writes

#### Scenario: Library changed concurrently
- **WHEN** `library_index_hash` differs but the graph hash still matches
- **THEN** the plan may be persisted atomically and the result reports that coverage is stale

#### Scenario: Same plan is replayed
- **WHEN** an already accepted plan is submitted again
- **THEN** the result is `already_applied` and graph semantics remain unchanged

### Requirement: Planner output SHALL use the canonical structural contract

Planner Skill output and TypeScript requests SHALL use the production Topic Plan payload contract, including selectors, evidence, scope, revision and collection limits. The producer SHALL use tag.and/or/not and combine. Unsupported selector aliases SHALL fail without automatic conversion.

#### Scenario: A producer emits invented selector keys

- **WHEN** output contains includeTags, excludeTags, match or strategy
- **THEN** final output structural validation rejects it before workflow apply
- **AND** no Synthesis mutation occurs

#### Scenario: A canonical nonempty plan is applied

- **WHEN** planner output passes shared structure validation and its graph basis is current
- **THEN** the real hook reaches the native application and preserves accepted plan facts across reopen
- **AND** the Python coverage and CAS checks remain independent domain validation
