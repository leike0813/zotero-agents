## MODIFIED Requirements

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

### Requirement: Bundle SHALL publish as a standalone repository

The release materializer SHALL assemble the generated bundle for `leike0813/zotero-library-agent-bundle` from verified repository inputs and the prepared release set.

#### Scenario: Bundle is materialized

- **WHEN** the release set contains a complete Host Bridge CLI prebuild identity
- **THEN** the repository candidate SHALL contain both Skills, schemas, helpers, installers, profile template, all supported binaries, and a release manifest
- **AND** its manifest SHALL record the shared `releaseSetId`, exact CLI identity, binary aggregate, seven checksums, bundle version, and bundle content digest.

#### Scenario: Bundle identity differs from another surface

- **WHEN** the bundle candidate does not match the CLI identity and release-set envelope used by the CLI bundle and Librarian Profile
- **THEN** unified publication SHALL reject all mutable advancement.
