## ADDED Requirements

### Requirement: ACP runner SHALL resolve Skill Runner schema assets consistently

The ACP runner SHALL resolve `input`, `parameter`, and `output` schema assets using Skill Runner-compatible rules: declared `runner.schemas.<key>` first, then `assets/<key>.schema.json` fallback.

#### Scenario: Default output schema is used

- **WHEN** a skill omits `runner.schemas.output`
- **AND** `assets/output.schema.json` exists
- **THEN** ACP output validation SHALL validate final output against that default schema.

#### Scenario: Declared schema falls back

- **WHEN** a declared schema path is empty, absolute, escapes the skill root, or does not exist
- **AND** `assets/<key>.schema.json` exists
- **THEN** ACP SHALL use the default schema path for that key.

#### Scenario: Missing schema fails validation when required

- **WHEN** ACP needs to validate output
- **AND** neither the declared output schema nor `assets/output.schema.json` can be resolved
- **THEN** output validation SHALL fail with a schema diagnostic instead of silently passing.

### Requirement: ACP runner SHALL validate request input and parameter schemas

The ACP runner SHALL validate request `input` and `parameter` payloads before sending the first ACP prompt.

#### Scenario: Host-local file input is accepted

- **WHEN** an input schema key has `x-input-source=file` or no `x-input-source`
- **AND** the ACP request provides an existing absolute local path for that key
- **THEN** ACP SHALL include that path in the prompt input context.

#### Scenario: Invalid file input is rejected

- **WHEN** a file input is missing, relative, upload-relative, or points to a non-existing local file
- **THEN** ACP SHALL fail the run before prompting the agent with input validation diagnostics.

#### Scenario: Inline input and parameter are schema validated

- **WHEN** input keys marked `x-input-source=inline` or parameter keys are present
- **THEN** ACP SHALL validate them against their corresponding JSON schemas.

### Requirement: ACP runner SHALL render Skill Runner entrypoint prompts

The ACP runner SHALL render `runner.entrypoint.prompts.<engine>` when available, fall back to `common`, and only use the generic ACP prompt when no runner prompt is defined.

#### Scenario: Engine prompt takes precedence

- **WHEN** a runner defines both an engine-specific prompt and a common prompt
- **THEN** ACP SHALL render the prompt matching the resolved ACP agent family.

#### Scenario: Common prompt is rendered

- **WHEN** no engine-specific prompt exists
- **AND** `runner.entrypoint.prompts.common` exists
- **THEN** ACP SHALL render the common prompt with resolved `input`, `parameter`, `skill`, `run_dir`, and `engine_id` variables.

### Requirement: ACP runner SHALL recover valid package result files

The ACP runner SHALL attempt package result-file fallback when assistant output is invalid before exhausting repair/failure handling.

#### Scenario: Default result file recovers output

- **WHEN** assistant output is invalid
- **AND** the run workspace contains a valid `${skill_id}.result.json` outside `result/` and `.audit/`
- **THEN** ACP SHALL validate that file against the output schema and use it as the final result.

#### Scenario: Declared result file name is used

- **WHEN** `runner.entrypoint.result_json_filename` is declared
- **THEN** ACP SHALL use that filename instead of `${skill_id}.result.json` for fallback discovery.

#### Scenario: Invalid result file does not bypass repair

- **WHEN** a fallback result file is missing, invalid JSON, non-object, or schema invalid
- **THEN** ACP SHALL continue normal invalid-output repair or failure handling.

### Requirement: ACP runner SHALL preserve declared compatibility divergences

ACP Skills SHALL preserve its documented runtime divergences from Skill Runner.

#### Scenario: No target output schema is generated

- **WHEN** an ACP Skills run is prepared
- **THEN** ACP SHALL NOT generate `.audit/contracts/target_output_schema.json`
- **AND** it SHALL NOT pass active structured-output schema options to the ACP backend.

#### Scenario: Artifact paths are not rewritten

- **WHEN** final output contains schema fields annotated with `x-type=artifact` or `x-type=file`
- **THEN** ACP SHALL NOT rewrite those fields to bundle-relative paths.

