## ADDED Requirements

### Requirement: CLI SHALL publish a mechanism-only Agent Surface v4
The offline `surface` command family SHALL publish `host-bridge.agent-surface.v4` with global options and exact command argv, input/output schemas, effects, approval requirements, typed handles, recovery rules, targets, operational summaries, and operational aliases. It SHALL NOT contain research-task guidance or a built-in workflow catalog.

#### Scenario: Generic prose does not change CLI identity
- **WHEN** only Generic task guidance or built-in workflow descriptions change
- **THEN** the embedded Agent Surface bytes and CLI build fingerprint remain unchanged

### Requirement: Surface discovery SHALL remain operational
`surface identity`, `surface describe`, and `surface search` SHALL retain their public command names. Search SHALL index command identity, path, summary, and operational aliases only.

#### Scenario: Search returns exact mechanism contracts
- **WHEN** an agent searches for an operational term
- **THEN** results identify matching commands without returning research-task policy

### Requirement: Minimum Skill SHALL be the complete CLI operating contract
The `zotero-bridge-cli` `SKILL.md` SHALL contain the complete executable CLI loop, installation/profile selection, connection diagnosis, invocation, pagination, files, approvals, handles, workflow control planes, output evidence, and failure recovery. Its only instruction reference SHALL be the source-generated exhaustive command reference. It SHALL NOT select research tasks for the agent.

#### Scenario: Minimum stays task-neutral
- **WHEN** the Minimum Skill is rendered
- **THEN** exact commands are complete and no query, acquisition, analysis, synthesis, or curation workflow policy is embedded

#### Scenario: Generated command card is complete
- **WHEN** one v4 command descriptor is rendered into the offline reference
- **THEN** its argv bindings, input and result schemas, pagination, effects, approval scope, handles, recovery, targets, aliases, and search visibility remain available

### Requirement: CLI SHALL inspect agent bundles locally
The CLI SHALL expose `workflow agent-bundle inspect --bundle <DIR_OR_ZIP>` and return the agent run identity, request identities, and declared output contracts without contacting Host Bridge.

#### Scenario: Inspect does not consume a handle
- **WHEN** an agent inspects a valid downloaded handoff bundle
- **THEN** the CLI returns its contract inventory without network access, approval, state mutation, or handle consumption

### Requirement: CLI SHALL validate agent results locally
The CLI SHALL expose `workflow agent-result validate --contract <FILE> --result <DIR_OR_ZIP>` and validate the result namespace, declared result JSON, artifact manifest, and output-contract requirements without applying the result.

#### Scenario: Invalid result is rejected before apply
- **WHEN** a result bundle does not match its output contract
- **THEN** validation returns a structured local-input failure and no Host Bridge request is sent

### Requirement: CLI human-readable text SHALL name the public Zotero boundary
CLI help, summaries, recovery guidance, diagnostics, and Agent Surface human-readable fields SHALL use `Zotero Bridge service`, `Zotero-side approval`, `Zotero-managed state`, or equivalent task-oriented language. They SHALL NOT expose ambiguous `Host Bridge`, `Host-owned`, or `Host-local` prose. Formal machine identifiers SHALL remain unchanged.

#### Scenario: CLI help is understandable without repository context
- **WHEN** an agent reads CLI help or a command descriptor
- **THEN** it can identify the Zotero operation and authority boundary without knowing what the repository calls its host-side implementation

## REMOVED Requirements

### Requirement: CLI SHALL publish a complete Agent Surface v3
**Reason**: The v3 descriptor couples CLI mechanism identity to higher-level research guidance and the workflow catalog.
**Migration**: Consumers use the v4 descriptor from the unchanged `surface` command family.

### Requirement: Agent Surface v2 SHALL separate control dimensions
**Reason**: The public descriptor is replaced by the v4 mechanism-only contract.
**Migration**: Consumers read the corresponding v4 approval, effect, handle, recovery, and target fields.

### Requirement: Generated agent guidance SHALL use canonical argument intent
**Reason**: Research guidance no longer belongs to the embedded CLI descriptor.
**Migration**: Generic task Skills own intent selection and resolve exact arguments through Minimum.

### Requirement: Wrapper skill SHALL compose semantic guidance with generated surface mappings
**Reason**: Minimum is intentionally limited to the CLI operating contract.
**Migration**: Research-task semantics are provided by the Generic coordinator and task Skills.
