## MODIFIED Requirements

### Requirement: Replay artifacts MUST expose sample, stage, and cadence identity

Replay MUST require a normalized free-text governance stage, derive a sample name from the selected trace filename, and retain the sample, stage, and selected cadence in result provenance and paired artifact filenames. A default source-identifiable trace filename MUST retain its `chat` or `skills` token in the derived sample and paired Replay artifact stem.

#### Scenario: User enters a governance stage

- **WHEN** a complete trace is selected and the user enters a valid non-empty stage
- **THEN** Replay MUST preserve the normalized exact stage in `replayConfig.phase`
- **AND** retry, cancellation, failure, preflight, and path selection MUST NOT discard the in-session stage draft

#### Scenario: Stage is invalid

- **WHEN** the stage is empty, exceeds the supported length, or contains a control character
- **THEN** Replay MUST reject the start before target setup or Workspace changes
- **AND** Dashboard MUST expose a structured validation state without relying on a complete error sentence

#### Scenario: Replay results are persisted

- **WHEN** Replay saves a complete or incomplete matrix
- **THEN** the JSON and Markdown filenames MUST share a stem containing the trace filename-derived sample slug, stage slug, cadence, timestamp, and collision-safe nonce
- **AND** the exact sample display name, stage, and cadence MUST appear in JSON and Markdown provenance
- **AND** trace digest rather than sample display name MUST remain the comparison identity

#### Scenario: Source-identifiable trace is replayed

- **WHEN** Replay selects `acp-trace-chat-*` or `acp-trace-skills-*`
- **THEN** its paired result filenames MUST begin with `acp-replay-chat-*` or `acp-replay-skills-*` respectively
- **AND** Replay SHALL NOT maintain a second source-to-filename mapping.
