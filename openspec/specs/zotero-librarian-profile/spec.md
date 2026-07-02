# zotero-librarian-profile Specification

## Purpose
TBD - created by syncing change add-host-bridge-semantic-terminology-guidance. Update Purpose after archive.

## Requirements

### Requirement: Zotero Librarian profile SHALL expose shared terminology guidance

The Zotero Librarian profile SHALL include the shared Host Bridge terminology
reference so agents can interpret user-facing Zotero, Synthesis, workflow,
artifact, handle, and writeback terms consistently.

#### Scenario: Profile routes ambiguous terms to terminology

- **WHEN** a Zotero Librarian task uses shorthand or ambiguous Host Bridge terms
- **THEN** the profile skill SHALL direct the agent to
  `references/terminology.md`
- **AND** the terminology reference SHALL preserve the same canonical meanings
  as the wrapper skill.

#### Scenario: Profile terminology is generated from the shared source

- **WHEN** the Zotero Librarian profile is rendered
- **THEN** `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/terminology.md`
  SHALL be copied from the shared terminology source
- **AND** the profile manifest source checksum SHALL include that shared
  terminology content.

### Requirement: Profile SHALL provide dedicated agent-owned workflow guidance

The Zotero Librarian profile SHALL include a dedicated skill for agent-owned
workflow handoffs and route suitable tasks to it.

#### Scenario: Agent-run workflow task is routed

- **WHEN** a task is suitable for agent-owned execution through `workflow agent-run`
- **THEN** the main librarian skill SHALL route the agent to
  `zotero-workflow-agent-runner`
- **AND** the dedicated skill SHALL explain `agentRunId`, `agentRequestId`,
  output bundle handling, and `workflow agent-apply`.

### Requirement: Profile SHALL define workflow execution policy

The profile SHALL define current workflow execution rules for selection,
concurrency, and monitoring.

#### Scenario: Workflow selection is prepared

- **WHEN** an agent prepares a workflow submission from Zotero item, note, or
  attachment handles
- **THEN** the profile SHALL instruct the agent to normalize to top-level parent
  item refs unless the workflow explicitly requires no selection.

#### Scenario: Backend workflow concurrency is uncertain

- **WHEN** an ACP or SkillRunner workflow would start more than one backend task
- **THEN** the profile SHALL default to serial execution
- **AND** require user confirmation before launching more than one task for the
  same provider or backend group.

#### Scenario: Workflow progress is monitored

- **WHEN** an agent needs run progress
- **THEN** Host-owned runs SHALL be monitored through notification inbox,
  `run get`, recent history, or skill-run events
- **AND** profile service scripts SHALL NOT use long-polling notification wait
  loops.

### Requirement: Profile SHALL include non-blocking helper scripts

The profile SHALL include helper scripts for deterministic workflow planning,
submission, and notification inbox maintenance.

#### Scenario: Helper script submits workflows

- **WHEN** the workflow helper submits a Host-owned or agent-owned workflow plan
- **THEN** it SHALL return after launch with workflow or agent run handles
- **AND** it SHALL NOT wait for workflow completion.

#### Scenario: Notification helper syncs inbox

- **WHEN** the notification helper synchronizes events
- **THEN** it SHALL call `run notification list`
- **AND** store lightweight event projections without transcript, workspace
  path, or provider private payload assumptions.

### Requirement: Zotero Librarian profile is generated from semantic sources

The Zotero Librarian profile SHALL keep semantic source files and generated profile files aligned through renderer and governance checks.

#### Scenario: Profile semantic guidance is current-state only

- **WHEN** Host Bridge workflow operation profile guidance is added or rendered
- **THEN** governance checks SHALL include both source and generated guidance in current-state-only validation
- **AND** shared terminology SHALL match the rendered profile terminology reference exactly.
