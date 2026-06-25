## MODIFIED Requirements

### Requirement: Runtime-authored business result file
The `manuscript-literature-framing` stage runtime SHALL write completed and
canceled business result payloads to `manuscript-literature-framing.result.json`
at the run workspace root and SHALL NOT write `result/result.json`.

#### Scenario: Final draft writes fallback business result
- **WHEN** `persist_final_draft` succeeds
- **THEN** the runtime writes `manuscript-literature-framing.result.json`
- **AND** the completed result exposes `artifact_manifest_path` for generated assets
- **AND** the completed result does not require a root-level `assets` object
- **AND** the runtime does not write `result/result.json`
- **AND** run-local LaTeX and diagnostic assets remain under `result/`.

#### Scenario: Runtime writes artifact manifest
- **WHEN** `persist_final_draft` succeeds
- **THEN** the runtime writes `result/manuscript-literature-framing-artifacts.json`
- **AND** every manifest value is an absolute path under the run workspace root
- **AND** every manifest path exists before the final result is written.

#### Scenario: Canceled branch writes fallback business result
- **WHEN** the `cancel` action succeeds
- **THEN** the runtime writes `manuscript-literature-framing.result.json`
- **AND** the runtime does not write `result/result.json`.

#### Scenario: Successful completed result is registered as a product
- **WHEN** the workflow run status is `succeeded`
- **AND** the business result kind is `writing.manuscript_literature_framing`
- **AND** the artifact manifest is readable
- **THEN** the apply hook SHALL register the manuscript literature framing product assets in Dashboard product storage using manifest paths.

#### Scenario: Failed or canceled result is not registered as a product
- **WHEN** the workflow run status is not `succeeded`
- **OR** the business result kind is not `writing.manuscript_literature_framing`
- **THEN** the apply hook SHALL NOT register a Dashboard product
- **AND** the apply hook result SHALL remain ok with `product: null`.

### Requirement: ACP final output envelope
The skill instructions SHALL require the final assistant output to be a single
JSON object containing `__SKILL_DONE__: true` plus the business fields from
`manuscript-literature-framing.result.json`.

#### Scenario: Completed final output includes marker
- **WHEN** the final draft runtime action has written
  `manuscript-literature-framing.result.json`
- **THEN** the assistant final output includes `__SKILL_DONE__: true`
- **AND** the completed output includes `artifact_manifest_path`
- **AND** all remaining root-level fields come from the business result file.

#### Scenario: Business result files exclude marker
- **WHEN** the runtime writes `manuscript-literature-framing.result.json`
- **THEN** that file does not contain `__SKILL_DONE__`
- **AND** `assets/output.schema.json` does not require `__SKILL_DONE__`.

### Requirement: Gate-returned file paths
The `manuscript-literature-framing` gate runtime SHALL return cwd-independent file paths for cross-step agent actions.

#### Scenario: Gate provides absolute execution paths
- **WHEN** the gate runtime returns a next action
- **THEN** `state_path`, `required_writes`, and `command_example` use absolute paths derived from the run workspace state path
- **AND** the command example does not require the agent to `cd` into the skill package.
