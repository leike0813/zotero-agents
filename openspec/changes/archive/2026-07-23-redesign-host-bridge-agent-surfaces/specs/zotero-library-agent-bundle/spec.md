## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Bundle SHALL expose an agent-neutral evidence contract
**Reason**: Evidence is represented directly in the shared task result and no runtime consumer requires a second envelope.
**Migration**: Producers populate the result's `evidence` and `artifacts` arrays.

### Requirement: Bundle helpers SHALL be stateless and deterministic
**Reason**: The Generic helper is removed; reusable bundle/result operations are first-class Minimum CLI commands.
**Migration**: Use `workflow agent-bundle inspect`, `workflow agent-result validate`, and the existing `workflow profile validate` command.

### Requirement: Library Agent references SHALL provide executable bounded journeys
**Reason**: Multiple journey fragments duplicate the new task-owned workflows.
**Migration**: Invoke the matching task Skill and read its directly linked comprehensive playbook.

### Requirement: Library Agent SHALL preserve evidence across control boundaries
**Reason**: The separate evidence handoff is replaced by the shared inline-evidence result contract.
**Migration**: Carry evidence entries and artifact paths in `zotero-library-task.result.v1`.
