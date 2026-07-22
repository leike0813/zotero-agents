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

### Requirement: Bundle SHALL expose an agent-neutral evidence contract
The bundle SHALL provide a JSON Schema for `zotero-library-agent.evidence-bundle.v1` that records portable evidence and artifact provenance without owning a downstream workflow system.

#### Scenario: Evidence bundle is valid
- **WHEN** an agent records a completed library or plugin operation
- **THEN** the evidence bundle SHALL identify producer and CLI versions, operation kind, stable subjects, sanitized command provenance, artifacts with SHA-256 digests, optional typed workflow handles, and writeback state
- **AND** it SHALL be consumable without ResearchSpec-specific fields.

#### Scenario: Evidence includes sensitive or private state
- **WHEN** an evidence candidate contains an authentication token, full transcript, agent-private state, or an artifact whose declared digest does not match its file
- **THEN** validation SHALL fail with a structured error.

### Requirement: Bundle helpers SHALL be stateless and deterministic
The bundle SHALL provide Python standard-library helpers for building and validating evidence bundles and inspecting or validating agent-run request/result bundles.

#### Scenario: Helper completes an operation
- **WHEN** a helper command receives explicit input and output paths
- **THEN** it SHALL perform one bounded operation and exit with structured JSON output
- **AND** it SHALL NOT invoke Host Bridge, create a database, register a run, schedule work, or create an implicit state directory.

#### Scenario: Workflow bundle is validated
- **WHEN** the helper validates an agent-run result
- **THEN** it SHALL use the request bundle's declared schema and file rules
- **AND** it SHALL NOT invent or rewrite semantic result content.

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

### Requirement: Library Agent SHALL preserve evidence across control boundaries

Task recipes SHALL distinguish current Host facts, local files, returned typed handles, approval state, and apply-back receipts.

#### Scenario: Task crosses a workflow or mutation boundary
- **WHEN** an agent submits, monitors, interacts with, applies, or mutates Host state
- **THEN** the recipe SHALL identify the required handle, review or approval boundary, observable completion evidence, and safe recovery command.

### Requirement: Library Agent repository README SHALL select the bounded surface

The Library Agent release repository README SHALL explain when to choose the bounded on-demand surface, how to verify the bundled CLI identity, where to enter common task journeys, and when resident Librarian behavior is the appropriate alternative.

#### Scenario: User or agent opens the bundle repository
- **WHEN** the repository README is the first document read
- **THEN** it SHALL identify the bundle as the bounded task surface
- **AND** SHALL route connection details to the CLI wrapper and resident indexing, scheduling, and maintenance to the Librarian Profile.

### Requirement: Library Agent references SHALL provide executable bounded journeys

The bundle SHALL provide detailed input-to-command-to-evidence-to-recovery playbooks for current context, library and note reads, readiness, synthesis research context, Host-owned workflows, agent-owned handoff and apply-back, concrete writeback, and Product/file delivery.

#### Scenario: Agent executes a bounded journey
- **WHEN** the agent receives only the materialized Library Agent bundle
- **THEN** it SHALL be able to choose the correct command plane, construct inputs, preserve typed handles, identify approval boundaries, and prove completion without repository source access.

### Requirement: Library Agent SHALL separate workflow and provider preparation
Library Agent guidance SHALL validate workflow input and backend provider profiles independently and SHALL combine them only when invoking workflow submit.

#### Scenario: Agent prepares a host-owned workflow
- **WHEN** an agent selects a workflow and backend
- **THEN** it reads and validates the workflow contract separately from the backend profile contract
- **AND** reuses a validated profile only when the workflow provider requirements are compatible.

### Requirement: Library Agent SHALL document the ordered research journey
The bounded journey SHALL describe literature search ingest, literature analysis, reference-sidecar refresh, citation-graph update, topic synthesis create/update, and research-bundle export in that order.

#### Scenario: Agent follows the journey
- **WHEN** a stage changes only a subset of papers
- **THEN** the next maintenance stage uses the committed paper scope by default
- **AND** full-library maintenance requires explicit intent or graph bootstrap.
