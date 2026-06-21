## ADDED Requirements

### Requirement: Sequence handoff SHALL use typed bindings

Sequence workflow runtime SHALL resolve step handoff from explicit `bindings` with `kind: "value" | "file"`.

#### Scenario: Value binding copies a previous step field

- **WHEN** a step declares a `value` binding from a previous step result path
- **THEN** the resolved value SHALL be written to the declared request target.

#### Scenario: No implicit pass-through

- **WHEN** a step declares no handoff binding
- **THEN** the runtime SHALL NOT inject previous step output into `input.handoff`.

### Requirement: File handoff SHALL be provider-neutral

Sequence file handoff SHALL represent a logical file artifact and SHALL be materialized by the provider dispatch boundary.

#### Scenario: ACP file handoff

- **WHEN** a sequence runs on an ACP backend
- **AND** a file binding resolves to a local file path
- **THEN** the next ACP step SHALL receive a native absolute path in input
- **AND** the request SHALL NOT contain `upload_files`.

#### Scenario: SkillRunner local file handoff

- **WHEN** a sequence runs on a SkillRunner backend
- **AND** a file binding resolves to a frontend-local file path
- **THEN** the next SkillRunner step SHALL receive an upload-relative input path
- **AND** the request SHALL include the matching `upload_files` entry.

#### Scenario: SkillRunner reused workspace file handoff

- **WHEN** a sequence runs on a SkillRunner backend
- **AND** a file binding resolves to a file produced by a previous step in the reused workspace
- **THEN** the next SkillRunner step SHALL receive an upload-relative input path
- **AND** the request SHALL include `runtime_options.workspace.file_bindings`
- **AND** the request SHALL NOT include an `upload_files` entry for the backend-local source file.
