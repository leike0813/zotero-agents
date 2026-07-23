# zotero-library-agent-bundle Specification

## Purpose
TBD - created by syncing change add-zotero-library-agent-bundle. Update Purpose after archive.

## Requirements

### Requirement: Agent-neutral bundle SHALL provide an on-demand Zotero control surface

The repository SHALL generate a `zotero-library-agent-bundle` for general third-party agents that need to inspect a Zotero library or operate Zotero Agents during one bounded task. Its first-level guidance SHALL route stable intents to canonical commands and progressively load command/output/error contracts.

#### Scenario: Agent installs the bundle

- **WHEN** an agent consumes the published bundle
- **THEN** it SHALL receive the `zotero-library-agent` Skill, the `zotero-bridge-cli` wrapper Skill, the Host Bridge profile template, installers, and supported-platform CLI prebuilds
- **AND** it SHALL NOT receive Hermes profile configuration, cron jobs, resident indexes, or background monitoring state.

#### Scenario: Agent handles an on-demand task

- **WHEN** an agent needs current selection, library reads, annotations, files, products, synthesis data, workflows, approved mutations, run interaction, or diagnostics
- **THEN** the Skill SHALL route the task through canonical `zotero-bridge` command families and bounded current-task operations
- **AND** it SHALL identify required evidence, typed handles, approvals, and safe recovery.

### Requirement: Agent-facing surfaces SHALL keep task policy independent

The CLI wrapper, general library agent bundle, and Zotero Librarian profile SHALL maintain independent task-level semantic sources while consuming shared terminology, protocol control invariants, and generated Agent Control Contract references.

#### Scenario: Shared control fact changes

- **WHEN** a Host Bridge handle, approval, workflow ownership, file-transfer, writeback, retry, or state-change invariant changes
- **THEN** all rendered agent-facing surfaces SHALL receive the same shared current-state reference
- **AND** semantic governance SHALL detect stale generated copies.

#### Scenario: Resident maintenance policy changes

- **WHEN** the Zotero Librarian profile changes indexing, scheduling, inbox, monitoring, or maintenance behavior
- **THEN** the general library agent Skill SHALL NOT inherit that policy unless its own bounded task contract is deliberately changed.

### Requirement: Bundle version SHALL track the CLI release line independently
The bundle version SHALL use the recorded Host Bridge CLI major and minor components with a bundle-owned patch component.

#### Scenario: Bundle public content changes
- **WHEN** public Skill guidance, shared control facts, schemas, helpers, generated references, or package layout changes without a CLI major/minor change
- **THEN** the bundle patch SHALL be increased exactly once before rendering and publication.

#### Scenario: CLI patch changes
- **WHEN** only the recorded CLI patch changes
- **THEN** the bundle version SHALL remain unchanged
- **AND** the bundle manifest SHALL record the exact CLI version and binary checksum set it contains.

### Requirement: Bundle SHALL publish as a standalone repository

The release materializer SHALL assemble the generated bundle for `leike0813/zotero-library-agent-bundle` from verified repository inputs and the prepared release set.

#### Scenario: Bundle is materialized

- **WHEN** the release set contains a complete Host Bridge CLI prebuild identity
- **THEN** the repository candidate SHALL contain both Skills, schemas, helpers, installers, profile template, all supported binaries, and a release manifest
- **AND** its manifest SHALL record the shared `releaseSetId`, exact CLI identity, binary aggregate, seven checksums, bundle version, and bundle content digest.

#### Scenario: Bundle identity differs from another surface

- **WHEN** the bundle candidate does not match the CLI identity and release-set envelope used by the CLI bundle and Librarian Profile
- **THEN** unified publication SHALL reject all mutable advancement.

### Requirement: Library Agent guidance SHALL be composed from facts and bounded task semantics

The Zotero Library Agent bundle SHALL generate domain-oriented intent-to-command-to-evidence guidance by composing Agent Surface facts, shared family defaults, and Library-Agent-owned semantic supplements.

#### Scenario: Agent routes a bounded task
- **WHEN** an agent needs connectivity or context, library data, workflow/run control, mutation/file/Product operations, Synthesis data, or diagnostics
- **THEN** the bundle SHALL route the intent to canonical commands and the evidence needed to finish that bounded task
- **AND** it SHALL load detailed command and error contracts only when relevant.

#### Scenario: Agent avoids a misleading command
- **WHEN** two commands have related names but different ownership, freshness, approval, handle, or state-change behavior
- **THEN** the guidance SHALL provide a current-state `avoidWhen` or equivalent negative selection rule.

#### Scenario: Bundle is rendered
- **WHEN** semantic source or command facts change
- **THEN** the generated bundle SHALL be rebuilt through the canonical renderer
- **AND** no generated command table SHALL require independent manual maintenance.

### Requirement: Library Agent repository README SHALL select the bounded surface

The Library Agent release repository README SHALL explain when to choose the bounded on-demand surface, how to verify the bundled CLI identity, where to enter common task journeys, and when resident Librarian behavior is the appropriate alternative.

#### Scenario: User or agent opens the bundle repository
- **WHEN** the repository README is the first document read
- **THEN** it SHALL identify the bundle as the bounded task surface
- **AND** SHALL route connection details to the CLI wrapper and resident indexing, scheduling, and maintenance to the Librarian Profile.

### Requirement: Library Agent SHALL separate workflow and provider preparation
Library Agent guidance SHALL validate workflow input and backend provider profiles independently and SHALL combine them only when invoking workflow submit.

#### Scenario: Agent prepares a host-owned workflow
- **WHEN** an agent selects a workflow and backend
- **THEN** it reads and validates the workflow contract separately from the backend profile contract
- **AND** reuses a validated profile only when the workflow provider requirements are compatible.

### Requirement: Generic bundle SHALL contain one coordinator and five task Skills
The bundle SHALL publish `zotero-library-agent` as the routing and composition Skill plus `zotero-library-query`, `zotero-literature-acquisition`, `zotero-literature-analysis`, `zotero-research-synthesis`, and `zotero-library-curation` as bounded task Skills.

#### Scenario: Single task is routed once
- **WHEN** a request has one bounded research goal
- **THEN** the coordinator selects the matching task Skill without reproducing its complete playbook

#### Scenario: Multi-stage request is composed
- **WHEN** a request spans multiple task domains
- **THEN** the coordinator orders the task Skills, carries verified evidence between stages, and returns one final result

### Requirement: Every Generic task Skill SHALL be independently executable
Each task Skill SHALL contain its goal, inputs, primary workflow, hard constraints, completion criteria, and failure handling in `SKILL.md`, and SHALL use its directly linked comprehensive playbook only for deeper decision tables, examples, and edge cases.

#### Scenario: Task Skill runs directly
- **WHEN** an agent invokes a task Skill without first loading the coordinator
- **THEN** the Skill can execute using the declared Minimum dependency and its own contract

### Requirement: Generic Skills SHALL share one inline-evidence result contract
All six Generic Skills SHALL use `zotero-library-task.result.v1` with required `schema`, `status`, and `summary`; status SHALL be `completed`, `canceled`, or `failed`; and evidence, artifacts, and diagnostics SHALL be represented in optional structured arrays in the same result.

#### Scenario: Completed result carries evidence inline
- **WHEN** a task completes with source support
- **THEN** its runner result contains structured evidence entries and does not require a second evidence bundle

### Requirement: Generic SHALL include Minimum without duplicating mechanism policy
The materialized Generic surface SHALL contain the complete Minimum component byte-identically. Generic guidance SHALL delegate exact argv, approvals, handles, and recovery details to Minimum.

#### Scenario: CLI contract changes propagate by composition
- **WHEN** Minimum is rebuilt
- **THEN** Generic receives the exact rebuilt Minimum component without regenerating Generic task prose into the CLI descriptor

### Requirement: Generic SHALL own bounded workflow execution policy
The coordinator reference SHALL define Zotero-managed workflow selection and monitoring, self-owned agent handoff execution and apply-receipt recovery, Product/file/artifact evidence, and multi-stage research recovery. Task Skills SHALL apply that cross-task policy without duplicating exact CLI mechanics.

#### Scenario: Hermes delegates a self-owned handoff
- **WHEN** a hosted task selects a workflow whose self-owned mode is supported
- **THEN** the inherited Generic coordinator supplies request inspection, result validation, apply-back, and durable receipt semantics
