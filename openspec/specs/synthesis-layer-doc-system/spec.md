## Purpose

Synthesis docs describe Zotero Library SSOT, sidecar cache, explicit operations, and destructive hard-cut cleanup.
## Requirements
### Requirement: Active docs hard-cut old synchronization model

Active Synthesis docs and specs SHALL describe Zotero Library SSOT, sidecar cache, explicit operations, and removal of dirty-event/WorkItem/startup-reconcile synchronization.

#### Scenario: Developer reads active docs
- **WHEN** active docs discuss runtime, state machines, events, sequences, rebuild, or maintenance
- **THEN** they SHALL identify dirty events, WorkItems, WorkRuns, startup reconcile, queue drain, and Registry rebuild as removed implementation targets
- **AND** they SHALL NOT describe them as legacy mechanisms that may remain in active implementation.
### Requirement: Active docs define destructive cleanup expectations

Active docs SHALL state that this hard cut permits destructive Synthesis sidecar schema replacement and removal of old runtime tables.

#### Scenario: Implementation plan is reviewed
- **WHEN** a developer prepares implementation tasks
- **THEN** the docs SHALL require removal of old tables, APIs, UI projection, and tests
- **AND** they SHALL reject no-op compatibility shims for the old synchronization model.
### Requirement: Docs describe active sidecar backend semantics

Synthesis layer docs SHALL describe Reference Sidecar refresh and Citation Graph cache rebuild as separate explicit operations.

#### Scenario: Docs mention refresh and graph cache
- **WHEN** active docs describe Reference Sidecar refresh
- **THEN** they SHALL state that refresh updates sidecar rows and may trigger a separate visible graph incremental refresh or mark graph cache stale
- **AND** they SHALL NOT state that refresh synchronously rebuilds graph cache.

#### Scenario: Docs describe readiness
- **WHEN** active docs describe sidecar or graph readiness
- **THEN** they SHALL name cache basis as the data readiness source
- **AND** they SHALL not name legacy sidecar state files, sidecar index files, or graph index files as runtime readiness sources.
### Requirement: Docs distinguish lightweight and advanced reference matching

Active Synthesis docs SHALL describe Reference Sidecar refresh, Advanced Reference Binding, and Advanced External Dedupe as separate algorithms with separate triggers and materialization policy.

#### Scenario: Developer reads matching docs
- **WHEN** docs describe Advanced Reference Matching
- **THEN** they SHALL state that binding and external dedupe are separate passes
- **AND** fuzzy external dedupe SHALL be documented as review-only in this version.
### Requirement: Harness documentation distinguishes benchmark and realtime debugging

Active documentation SHALL distinguish the old fixture/gold-label benchmark
harness from the new realtime Synthesis Index algorithm harness.

#### Scenario: Developer chooses a harness
- **WHEN** a developer wants to inspect current Zotero and plugin database state
  and run cluster dedupe experiments
- **THEN** documentation SHALL direct them to `tools/synthesis-index-harness`.

#### Scenario: Cluster classifier is documented
- **WHEN** active documentation describes contained-title dedupe
- **THEN** it SHALL describe eligibility filtering, structured bibliographic
  suffix classification, semantic extension risk, and the prohibition on using
  an ever-growing venue token list as the primary classifier.
### Requirement: Active Docs SHALL Describe Reference Quality Responsibility Boundaries

Active docs SHALL describe the distinction between skill extraction quality,
workflow apply fallback filtering, and Synthesis sidecar ingestion.

#### Scenario: Developer reads reference quality docs
- **WHEN** active docs describe literature-digest references entering Synthesis
- **THEN** they SHALL state that the skill should own extraction quality
- **AND** workflow apply only removes deterministic bad rows before note writing
- **AND** Synthesis sidecar ingestion only provides a fallback deterministic skip for legacy/imported inputs.

#### Scenario: Developer reads skill upgrade guidance
- **WHEN** active docs or artifacts describe the external literature-digest Stage 4 gate
- **THEN** they SHALL distinguish hard-block defects from soft warning defects
- **AND** they SHALL recommend preserving the existing references array compatibility shape.
### Requirement: Docs define Workbench surface refresh architecture

Active Synthesis documentation SHALL describe Shell, Chrome, and Surface read models as the Workbench UI architecture.

#### Scenario: Developer reads Workbench docs
- **WHEN** a developer reads active Synthesis Workbench documentation
- **THEN** the docs SHALL state that full snapshot reads are debug-only
- **AND** they SHALL define allowed surface invalidation and progress update behavior.
### Requirement: Active Docs SHALL Treat Cluster Dedupe As Production Policy

Active Synthesis docs SHALL describe cluster-first external dedupe as the
production Advanced Reference Matching policy.

#### Scenario: Developer reads active reference-resolution docs
- **WHEN** docs describe Advanced External Dedupe
- **THEN** they SHALL state that production `runAdvancedReferenceMatchingNow`
  uses cluster-first dedupe
- **AND** they SHALL NOT describe production as wired to the old pairwise
  dedupe algorithm.
### Requirement: Docs describe graph incremental and full rebuild modes


Active Synthesis documentation SHALL describe source-slice incremental graph refresh and explicit full graph rebuild as separate maintenance modes.

#### Scenario: Docs no longer say graph cache is only full rebuilt

- **WHEN** readers consult runtime, graph, performance, UI, state-machine, or invariant docs
- **THEN** they SHALL see the incremental refresh trigger rules and bootstrap policy.
### Requirement: Synthesis docs describe related-items sync as graph-optional


Active Synthesis documentation SHALL describe related-items sync as an independent visible operation that may use graph cache as a fast path but can compute accepted library-to-library edges from sidecar facts.

#### Scenario: Docs describe update ordering and independence

- **WHEN** a user reads runtime or citation graph documentation
- **THEN** it SHALL state that related-items sync runs after graph refresh attempts
- **AND** it SHALL state that graph cache success is not a correctness precondition
- **AND** it SHALL state that related-items sync does not rebuild graph cache.
### Requirement: Synthesis layer documentation SHALL describe artifact payload storage truthfully

Active documentation SHALL describe v2 anchored embedded payload storage and the Synthesis artifact availability boundary.

#### Scenario: Documentation mentions artifact availability
- **WHEN** active Synthesis docs describe artifact existence
- **THEN** they SHALL state that parseable embedded payload attachments are the artifact availability source
- **AND** hidden payload blocks or note-only presence are legacy/migration diagnostics only.
### Requirement: Active Synthesis docs SHALL match executable resolver contracts

Active documentation and agent-facing prompt text SHALL describe the same `resolvers.resolve` input shape used by Host Bridge, MCP, and CLI code.

#### Scenario: Docs show resolver wrapper object
- **WHEN** a reader consults CLI, MCP, or Synthesis resolver documentation
- **THEN** examples SHALL show a top-level `resolver` field
- **AND** active docs SHALL NOT present `topic_resolver` as a valid Host Bridge or CLI resolver input.
### Requirement: Docs describe deferred sidecar graph maintenance


Active Synthesis documentation SHALL state that digest apply and Reference Sidecar refresh write sidecar facts and mark graph/related-items sync stale, while graph refresh is an explicit follow-up maintenance action.

#### Scenario: Docs describe sidecar update ordering

- **WHEN** readers consult runtime, graph, UI, or contract documentation
- **THEN** they SHALL see that digest apply and Reference Sidecar refresh do not automatically run graph incremental refresh
- **AND** they SHALL see that related-items sync is deferred until successful manual stale graph refresh or explicit sync.
### Requirement: Docs describe scoped post-refresh related-items sync


Active Synthesis documentation SHALL state that manual stale graph refresh may run scoped related-items sync after graph refresh succeeds.

#### Scenario: Docs describe graph refresh follow-up

- **WHEN** readers consult graph or related-items documentation
- **THEN** they SHALL see that post-refresh related-items sync uses the final affected source refs
- **AND** full graph rebuild SHALL NOT be described as automatically running full-library related-items sync.
