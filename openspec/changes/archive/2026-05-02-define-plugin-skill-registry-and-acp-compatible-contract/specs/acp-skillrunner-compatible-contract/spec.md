## ADDED Requirements

### Requirement: ACP compatibility preserves SkillRunner workflow contract

The system SHALL keep `skillrunner.job.v1` as the workflow-facing request contract for future ACP SkillRunner-compatible execution.

#### Scenario: Workflow builds a skill request
- **WHEN** a workflow emits a `skillrunner.job.v1` request
- **THEN** the request MUST remain valid for SkillRunner REST execution
- **AND** future ACP-compatible execution MUST consume the same request shape through a compatibility layer.

### Requirement: ACP backend execution is deferred behind compatibility layer

The system SHALL NOT expose a workflow-facing `acp.skill.run.v1` request kind for this change.

#### Scenario: ACP-compatible backend is planned
- **WHEN** the ACP-compatible backend is implemented later
- **THEN** workflow authors MUST NOT need to change workflow manifests or `buildRequest()` output
- **AND** ACP-specific session, workspace, file, and output behavior MUST be internal to the provider compatibility layer.

### Requirement: Future ACP run-folder behavior aligns with SkillRunner

Future ACP-compatible run-folder materialization SHALL be based on SkillRunner's run-local skill snapshot, patch, prompt, and output contract behavior.

#### Scenario: Implementing ACP materialization later
- **WHEN** a future change implements ACP-compatible skill execution
- **THEN** it MUST reference SkillRunner run-folder materialization, skill patching, output contract prompt injection, run execution instructions, and bundle/result rules
- **AND** deviations MUST be documented as compatibility-layer differences, not workflow contract differences.

### Requirement: File-flow optimizations remain internal

ACP-compatible execution SHALL keep local file and bundle flow optimizations internal without changing the public `skillrunner.job.v1` request contract.

#### Scenario: ACP local file execution
- **WHEN** a future ACP-compatible backend receives `upload_files`
- **THEN** it MAY pass local paths through an internal manifest instead of copying files into an upload directory
- **AND** the workflow request payload MUST remain unchanged.

#### Scenario: ACP bundle output execution
- **WHEN** a future ACP-compatible backend handles `fetch_type=bundle`
- **THEN** it MAY expose an output directory through an internal bundle reader instead of zipping and unzipping files
- **AND** existing `applyResult()` hooks MUST continue to use the standard `bundleReader` interface.
