## ADDED Requirements

### Requirement: Runtime-authored business result file
The `manuscript-literature-framing` stage runtime SHALL write completed and
canceled business result payloads to `manuscript-literature-framing.result.json`
at the run workspace root and SHALL NOT write `result/result.json`.

#### Scenario: Final draft writes fallback business result
- **WHEN** `persist_final_draft` succeeds
- **THEN** the runtime writes `manuscript-literature-framing.result.json`
- **AND** the runtime does not write `result/result.json`
- **AND** run-local LaTeX and diagnostic assets remain under `result/`.

#### Scenario: Canceled branch writes fallback business result
- **WHEN** the `cancel` action succeeds
- **THEN** the runtime writes `manuscript-literature-framing.result.json`
- **AND** the runtime does not write `result/result.json`.

### Requirement: ACP final output envelope
The skill instructions SHALL require the final assistant output to be a single
JSON object containing `__SKILL_DONE__: true` plus the business fields from
`manuscript-literature-framing.result.json`.

#### Scenario: Completed final output includes marker
- **WHEN** the final draft runtime action has written
  `manuscript-literature-framing.result.json`
- **THEN** the assistant final output includes `__SKILL_DONE__: true`
- **AND** all remaining root-level fields come from the business result file.

#### Scenario: Business result files exclude marker
- **WHEN** the runtime writes `manuscript-literature-framing.result.json`
- **THEN** that file does not contain `__SKILL_DONE__`
- **AND** `assets/output.schema.json` does not require `__SKILL_DONE__`.

### Requirement: Framing payload structure gate
The stage runtime SHALL reject structurally empty framing analysis and writing
plan payloads before advancing later stages.

#### Scenario: Empty analysis payload is rejected
- **WHEN** a framing analysis action receives a non-empty object without the
  required field group for that analysis type
- **THEN** the runtime rejects the payload before writing it to state.

#### Scenario: Writing plan paragraphs require planning fields
- **WHEN** `persist_writing_plan` receives paragraph entries missing function,
  claim, evidence, citation candidate, topic provenance, or contribution
  alignment fields
- **THEN** the runtime rejects the payload before writing it to state.

### Requirement: Host-unavailable cancel branch
The skill SHALL document that unavailable required Zotero or Synthesis host calls
may terminate the run through the `cancel` action even when gate would otherwise
return a different next action.

#### Scenario: Required host call unavailable
- **WHEN** real execution requires a Zotero or Synthesis host call that is
  unavailable
- **THEN** the agent may run `stage_runtime.py --action cancel` with a payload
  containing `reason`, `message`, and optional `paperTitle`
- **AND** the final assistant output uses the canceled business result file with
  `__SKILL_DONE__: true`.
