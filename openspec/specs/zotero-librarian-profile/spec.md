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

### Requirement: Librarian guidance SHALL separate workflow and provider contracts
The resident profile SHALL describe provider profiles as backend-scoped request input and SHALL not present them as workflow-owned settings or Host-persisted resources.

#### Scenario: Resident agent plans workflow work
- **WHEN** the profile evaluates a candidate workflow
- **THEN** it inspects workflow requirements and provider capabilities separately
- **AND** it does not infer provider options from the workflow id.

### Requirement: Librarian profile SHALL document the ordered research journey
The profile SHALL index the six-stage research journey while preserving resident planning, monitoring, approval, and maintenance boundaries.

#### Scenario: Scheduled work encounters a mutating stage
- **WHEN** a scheduled pass reaches sidecar refresh, graph update, workflow submit, or apply-back
- **THEN** it records or reports the required action
- **AND** does not bypass the current Host approval contract.

### Requirement: Librarian SHALL follow durable recovery contracts
The resident profile SHALL treat operation and agent-apply receipts as the authority for unknown, partial, or interrupted writes.

#### Scenario: Apply is interrupted
- **WHEN** the resident Agent loses an apply response or observes outcome_unknown
- **THEN** it SHALL inspect the retained receipt and SHALL NOT blindly replay the write.

### Requirement: Hermes SHALL be a hosted facet over Generic
The Hermes profile SHALL include the Generic and Minimum components byte-identically and SHALL add only resident operating policy, persona, configuration, cron entries, installation support, and resident-service assets.

#### Scenario: Hosted task uses Generic policy
- **WHEN** Hermes answers a library question or performs a bounded research task
- **THEN** it invokes the corresponding Generic task Skill and adds only resident freshness or automation behavior

### Requirement: Librarian SHALL expose one resident service
The profile SHALL expose `scripts/zotero_librarian_service.py` as the single formal entrypoint for index, workflow catalog, watched run, notification, maintenance, synthesis attention, and scheduled operations.

#### Scenario: Cron invokes one-pass operations
- **WHEN** a scheduled job fires
- **THEN** it invokes one resident-service subcommand, receives a terminal receipt, and exits without long polling

### Requirement: Resident state SHALL have one schema owner
The resident service SHALL exclusively initialize and update `state.sqlite`. The database SHALL be a rebuildable cache and journal, while live Zotero and Host Bridge remain authoritative.

#### Scenario: Concurrent initialization is safe
- **WHEN** two read/monitor operations start against an empty state directory
- **THEN** schema initialization is transactional and both observe one valid schema version

### Requirement: Resident automation SHALL enforce authority tiers
Default scheduled work SHALL be limited to indexing, reading, monitoring, notifications, maintenance analysis, and reports. Workflow submission SHALL require an enabled named automation policy or an interactive request; Zotero apply-back SHALL retain Host approval; destructive maintenance SHALL require a current human decision.

#### Scenario: Default cron cannot submit
- **WHEN** the shipped schedule is validated
- **THEN** no default job can reach the workflow submit operation

### Requirement: Librarian Skill SHALL use three coherent references
The `zotero-librarian` Skill SHALL directly link comprehensive resident operations, automation policy, and state/recovery references. Resident operations SHALL cover every service command and receipt; automation policy SHALL cover workflow delegation, provider profiles, concurrency, cron, maintenance, and interactions; state/recovery SHALL cover freshness, atomic updates, handles, uncertain outcomes, and installation. Persona files SHALL NOT contain hidden execution constraints.

#### Scenario: Resident hard constraints are visible
- **WHEN** an agent loads only the Librarian `SKILL.md`
- **THEN** it can determine authority, freshness, scheduling, completion, and failure rules without reading persona text

#### Scenario: Self-owned work keeps one policy owner
- **WHEN** the Librarian encounters a supported self-owned agent workflow
- **THEN** it delegates the finite handoff to the inherited Generic coordinator and does not duplicate that playbook in resident references

### Requirement: Librarian guidance SHALL translate resident user intent
The Librarian Skill SHALL independently route natural-language library questions, one-pass supervision, run monitoring, maintenance proposals, and workflow planning while clarifying scope, schedule assumptions, reporting thresholds, interaction, and mutation authority.

#### Scenario: User requests recurring monitoring
- **WHEN** the user asks the resident agent to monitor on a cadence
- **THEN** the Skill distinguishes a current one-pass operation from an existing external schedule and never claims to create or modify cron

### Requirement: Workflow validation SHALL use the live selection contract
The resident operation SHALL describe the live workflow, inspect `inputs` and `validateSelection` separately, preserve the explicit raw Zotero selection, and invoke Host validation before the current authorized submit. Candidate production, filtering, grouping, and immutable prepared-unit construction SHALL remain Host-owned.

#### Scenario: Workflow requires attachments
- **WHEN** the workflow input contract accepts attachment members
- **THEN** the service SHALL preserve attachment identities in the raw selection
- **AND** it SHALL NOT unconditionally convert them to parent items or construct prepared units

#### Scenario: Live workflow contract changes
- **WHEN** current describe or validation facts differ from the reviewed intent
- **THEN** the operation SHALL stop before remote submission
- **AND** it SHALL require a new current review rather than replay cached planning state

### Requirement: Librarian SHALL delegate admission to the plugin-native queue
Interactive Librarian workflow execution SHALL use the inherited Generic and Minimum contracts to validate live workflow input, submit one reviewed raw selection, inspect Host submission state, and register concrete run handles for resident monitoring.

#### Scenario: Operator submits reviewed workflow
- **WHEN** the current operator has reviewed live `inputs`, `validateSelection`, workflow options, provider profile, execution ownership, result contract, and raw selection
- **THEN** Librarian SHALL invoke one Host workflow submission
- **AND** it SHALL NOT create or reserve profile-owned pending entries

#### Scenario: Submission is pending or admitted
- **WHEN** Host submission inspection reports pending or admitted units
- **THEN** the interactive operation SHALL report the current Host handles and next action
- **AND** resident cron SHALL NOT submit, cancel, approve, or replay those units

#### Scenario: Concrete run handles appear
- **WHEN** task discovery returns workflow or skill run handles
- **THEN** Librarian MAY register those handles with the existing watched-run service
- **AND** monitoring SHALL remain separate from admission

### Requirement: Retired plan state SHALL remain inert
The resident service SHALL NOT create, read, update, submit, or recover profile-owned workflow plan or plan-entry queue state. Existing unknown tables or plan files SHALL remain untouched and SHALL NOT influence current operations.

#### Scenario: Existing state database contains old plan tables
- **WHEN** the current resident service opens that database
- **THEN** it SHALL ignore those tables
- **AND** it SHALL neither submit their rows nor delete their data

### Requirement: Profile identity SHALL route resident state

The Librarian SHALL select one connection profile in this order: service `--profile`, `ZOTERO_BRIDGE_PROFILE`, then the platform well-known profile. The well-known profile SHALL use the existing default workspace. An explicit profile SHALL be identified by its expanded, absolute, normalized, platform-case-normalized path and a SHA-256 digest of that identity; profile file contents, tokens, endpoints, and other secrets SHALL not affect the digest.

#### Scenario: Explicit profiles are isolated

- **WHEN** two normalized explicit profile paths are used
- **THEN** their workspaces SHALL be distinct directories under `<base>/workspaces/<sha256>/`
- **AND** SQLite state, workflow catalog, watched runs, notifications, and local CLI installation SHALL remain profile-local.

#### Scenario: Existing default state remains owned by the default profile

- **WHEN** no explicit profile is selected
- **THEN** the service SHALL use `<base>/state.sqlite`
- **AND** existing state SHALL remain readable without migration or copying.

### Requirement: Workspace resolution SHALL fail closed

An explicit profile that does not exist, cannot be normalized, or resolves to an unusable workspace root SHALL return a structured error and SHALL NOT fall back to a shared workspace. A `--db` path SHALL be accepted only when it resolves inside the selected workspace; otherwise the operation SHALL return `workspace_path_outside_profile` before creating a database or parent directory.

#### Scenario: Database escape is rejected

- **WHEN** `--db` points outside the selected workspace
- **THEN** the service SHALL emit a failed operation receipt with `workspace_path_outside_profile`
- **AND** SHALL not create the database file.

### Requirement: One service process SHALL use one resolved workspace

The service SHALL resolve its workspace once at process startup and SHALL use the resulting database for every operation in that process. Explicit profile identity SHALL be passed to each `zotero-bridge` invocation so the resident connection and workspace identity cannot diverge.

#### Scenario: Bridge receives explicit profile

- **WHEN** an operation invokes `zotero-bridge` under an explicit profile
- **THEN** the invocation SHALL include that profile path in the CLI profile option or equivalent environment contract.
