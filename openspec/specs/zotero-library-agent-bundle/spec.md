# zotero-library-agent-bundle Specification

## Purpose
TBD - created by syncing change add-zotero-library-agent-bundle. Update Purpose after archive.

## Requirements

### Requirement: Agent-neutral bundle SHALL provide an on-demand Zotero control surface
The repository SHALL generate a `zotero-library-agent-bundle` for general third-party agents that need to inspect a Zotero library or operate Zotero Agents during a current task.

#### Scenario: Agent installs the bundle
- **WHEN** an agent consumes the published bundle
- **THEN** it SHALL receive the `zotero-library-agent` Skill, the `zotero-bridge-cli` wrapper Skill, the Host Bridge profile template, installers, and supported-platform CLI prebuilds
- **AND** it SHALL NOT receive Hermes profile configuration, cron jobs, resident indexes, or background monitoring state.

#### Scenario: Agent handles an on-demand task
- **WHEN** an agent needs Zotero context, library reads, annotations, files, products, synthesis data, workflows, approved mutations, run interaction, or diagnostics
- **THEN** the `zotero-library-agent` Skill SHALL route the task through canonical `zotero-bridge` command families and bounded current-task operations.

### Requirement: Agent-facing surfaces SHALL keep task policy independent
The CLI wrapper, general library agent bundle, and Zotero Librarian profile SHALL maintain independent task-level semantic sources while consuming shared protocol-level facts.

#### Scenario: Shared control fact changes
- **WHEN** a Host Bridge handle, approval, workflow ownership, file-transfer, or writeback invariant changes
- **THEN** all rendered agent-facing surfaces SHALL receive the same shared current-state reference
- **AND** semantic governance SHALL detect stale generated copies.

#### Scenario: Resident maintenance policy changes
- **WHEN** the Zotero Librarian profile changes indexing, scheduling, inbox, or maintenance behavior
- **THEN** the general library agent Skill SHALL NOT inherit that policy unless its own on-demand contract is deliberately changed.

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
The release renderer SHALL assemble the generated bundle and publish it to `leike0813/zotero-library-agent-bundle` from verified repository inputs.

#### Scenario: Bundle is published
- **WHEN** the standalone publisher runs with complete Host Bridge CLI prebuilds
- **THEN** the repository SHALL contain both Skills, schemas, helpers, installers, profile template, all supported binaries, and a release manifest
- **AND** every binary checksum SHALL match the recorded CLI release manifest.
