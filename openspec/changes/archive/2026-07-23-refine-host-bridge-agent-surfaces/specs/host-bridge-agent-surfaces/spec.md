## ADDED Requirements

### Requirement: Minimum command references SHALL be partitioned by operational surface
The Minimum Skill SHALL publish exhaustive generated command cards in disjoint references selected by canonical command root. Primary library, mutation, workflow, run, and synthesis roots SHALL each have one reference; supporting connection/context, file/Product/operation, and diagnostic roots MAY be coherently grouped.

#### Scenario: Agent needs one command
- **WHEN** an agent selects a canonical command
- **THEN** `SKILL.md` identifies exactly one directly linked reference containing that command
- **AND** the agent does not need to load unrelated command roots

#### Scenario: Command catalog changes
- **WHEN** a new canonical command root is added
- **THEN** rendering fails until the root has exactly one declared partition

### Requirement: Generic references SHALL be optional execution depth
Every Generic Skill SHALL begin and complete its primary workflow from `SKILL.md` alone. A reference SHALL be loaded only when a named complex branch, detailed decision table, worked path, or recovery case is relevant.

#### Scenario: Simple task starts directly
- **WHEN** an agent loads a Generic task Skill for a bounded ordinary request
- **THEN** the first workflow action operates on the request rather than requiring a reference read

### Requirement: Generic SHALL publish a built-in workflow selection catalog
The Generic coordinator SHALL directly link a generated catalog of official built-in workflows whose manifests are not marked `debug_only`. The catalog SHALL expose each workflow's purpose, declared invocation inputs, provider requirements, execution modes, selection facts, parameters, and result evidence while identifying live workflow description as runtime authority.

#### Scenario: Agent selects a likely built-in workflow
- **WHEN** a bounded research task may match a built-in workflow
- **THEN** the agent can inspect the optional catalog before performing live list, describe, validation, and submission

#### Scenario: Debug workflow is shipped
- **WHEN** an official workflow manifest declares `debug_only: true`
- **THEN** it is absent from the Generic catalog

### Requirement: Runtime and rendered workflow facts SHALL share one projection
Provider compatibility, required workflow options, execution modes, selection facts, and result evidence exposed by the generated catalog SHALL be derived from the same pure manifest projection used by runtime workflow description.

#### Scenario: Workflow manifest changes
- **WHEN** a catalog-relevant manifest field changes
- **THEN** runtime description and rendered catalog expose the same static contract after rendering
