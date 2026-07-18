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

### Requirement: Librarian profile treats large reads as paged work

The Zotero Librarian profile SHALL instruct agents to use explicit limits and
cursor metadata for broad library, topic, index, and graph reads.

#### Scenario: Agent needs broad graph context
- **WHEN** a task requires citation graph context
- **THEN** the profile SHALL prefer bounded graph slice, layout, metrics, or
  paged overview reads
- **AND** it SHALL NOT instruct agents to expect a full citation graph in one
  `synthesis graph overview` call.

### Requirement: Zotero Librarian profile is generated from semantic sources

The Zotero Librarian profile SHALL keep every profile-owned semantic source, including library maintenance guidance and workflow-agent runner references, aligned with generated profile files through one renderer ownership manifest and governance checks. Generated command, workflow, output, and error references SHALL derive from canonical Host Bridge descriptors rather than handwritten tables.

#### Scenario: Profile semantic guidance is current-state only

- **WHEN** Host Bridge workflow, maintenance, Agent Control Contract, or operating guidance is added or rendered
- **THEN** governance checks SHALL include both source and generated guidance in current-state-only validation
- **AND** shared terminology and control invariants SHALL match their rendered profile references exactly.

#### Scenario: Generated reference names an unavailable command

- **WHEN** profile guidance mentions a canonical command absent from the Agent Control Contract
- **THEN** semantic or surface validation SHALL fail before release preparation completes.

### Requirement: Request-level provider profile guidance
The Zotero Librarian profile SHALL distinguish a provider, a configured backend, and an external-agent-owned request-level provider profile. Its workflow guidance SHALL describe `autoApproveAcpPermissions` as an ACP-only provider option supplied during submission, not as Zotero write approval, a direct pending-permission action, or a Host-persisted setting.

#### Scenario: An agent selects a configured ACP policy

- **WHEN** an external workflow preset supplies an ACP backend and `autoApproveAcpPermissions: true` in its provider profile
- **THEN** the profile guidance directs the agent to submit that profile without treating it as a persisted Host Bridge configuration

### Requirement: Zotero Librarian profile SHALL retain a resident maintenance task model

The Zotero Librarian profile SHALL remain the Hermes-specific surface for continuous library maintenance in a fixed workspace and SHALL NOT be treated as the general third-party agent bundle. Repeated retrieval SHALL prefer the profile-owned local index, current authoritative facts SHALL be confirmed through Host Bridge, and scheduled jobs SHALL default to read-only behavior.

#### Scenario: Profile performs resident work

- **WHEN** Hermes runs index refresh, workflow catalog refresh, notification synchronization, run monitoring, inbox triage, or library hygiene
- **THEN** the profile SHALL use its profile-owned state, scripts, cron configuration, and maintenance policy.

#### Scenario: Profile needs current Host state

- **WHEN** indexed information can be stale or an operation depends on current selection, workflow, permission, or writeback state
- **THEN** the profile SHALL confirm the fact through a canonical Host Bridge read before acting.

#### Scenario: Scheduled task proposes mutation

- **WHEN** a scheduled maintenance job reaches a write or approval boundary
- **THEN** it SHALL stop at a reviewable proposal unless explicit policy authorizes that mutation.

#### Scenario: Shared protocol facts are rendered

- **WHEN** the profile consumes shared Host Bridge control invariants
- **THEN** those protocol facts SHALL match the CLI wrapper and general library agent copies
- **AND** the profile SHALL retain its independent resident task policy.

### Requirement: Librarian guidance SHALL compose resident policy over generated Host Bridge facts

The Zotero Librarian profile SHALL consume the same generated command and family facts as the general Library Agent while keeping resident indexing, scheduling, monitoring, maintenance, and local-state policy in profile-owned semantic sources.

#### Scenario: Resident task selects a data source
- **WHEN** repeated retrieval can use the profile-owned local index
- **THEN** the profile SHALL prefer that index for discovery
- **AND** SHALL confirm current selection, workflow, permission, product, and writeback facts through canonical Host Bridge reads before acting.

#### Scenario: Scheduled work reaches a state-change boundary
- **WHEN** scheduled maintenance would require approval or mutate Host state
- **THEN** the profile SHALL stop at a reviewable proposal unless explicit current policy authorizes the operation.

#### Scenario: Profile guidance is rendered
- **WHEN** shared command facts or profile semantic supplements change
- **THEN** the renderer SHALL compose the generated profile without copying bounded task policy into the CLI wrapper or resident policy into the general Library Agent.

### Requirement: Librarian references SHALL use progressive domain disclosure

The profile SHALL expose short first-level routing guidance and load domain, output, or error references only for the current task.

#### Scenario: Librarian handles an unfamiliar Host Bridge domain
- **WHEN** a task involves context navigation, attachments/files, Product lifecycle, workflow/run interaction, Synthesis subdomains, or diagnostics
- **THEN** the profile SHALL route to the relevant generated domain reference
- **AND** SHALL NOT require scanning one flat complete command table.

### Requirement: Librarian repository README SHALL select the resident surface

The Librarian Profile release repository README SHALL explain installation, resident indexing and scheduling, live Host Bridge confirmation, default read-only scheduled behavior, monitoring, and reviewable recovery.

#### Scenario: User or agent opens the profile repository
- **WHEN** the repository README is the first document read
- **THEN** it SHALL distinguish resident work from bounded Library Agent tasks and CLI-only integration
- **AND** SHALL route detailed policy to profile-owned skills and references rather than duplicating generated command tables.

### Requirement: Librarian references SHALL document resident operating contracts

The Profile SHALL document local-index freshness and atomic refresh, every scheduled job's read/write and silence policy, notification and run monitoring, workflow catalog refresh and live confirmation, cache and graph maintenance boundaries, helper-script I/O, and agent-owned apply-back receipts.

#### Scenario: Resident work reaches uncertain or mutable state
- **WHEN** cached facts may be stale, a schedule proposes a write, or apply-back is interrupted
- **THEN** the Profile SHALL identify the required live Host Bridge confirmation, approval or review stop, preserved local state, and auditable recovery command.
