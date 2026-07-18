## ADDED Requirements

### Requirement: Replay artifacts MUST expose human-readable sample and stage identity

Replay MUST require a normalized free-text governance stage, derive a sample name from the selected trace filename, and retain both values in result provenance and paired artifact filenames.

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
- **THEN** the JSON and Markdown filenames MUST share a stem containing the trace filename-derived sample slug, stage slug, timestamp, and collision-safe nonce
- **AND** the exact sample display name and stage MUST appear in JSON and Markdown provenance
- **AND** trace digest rather than sample display name MUST remain the comparison identity

### Requirement: Replay progress MUST distinguish current and completed matrix slots

Replay MUST publish the current surface, run role, run index, matrix position, and start time separately from the last completed record.

#### Scenario: A matrix slot starts

- **WHEN** the runner is about to prepare a matrix slot
- **THEN** it MUST await current-slot publication before target preparation and profile start
- **AND** that publication MUST occur outside the profile window

#### Scenario: A matrix slot completes

- **WHEN** profiler finish and target cleanup complete
- **THEN** Replay MUST update completed progress and structured per-record evidence
- **AND** cancellation, failure, or terminal completion MUST clear current-slot state

### Requirement: Dashboard MUST present Replay evidence through progressive disclosure

The unified ACP Trace & Replay surface MUST prioritize identity, validation, required inputs, matrix progress, errors, and formal surface summaries while keeping advanced configuration and detailed evidence accessible without dominating the default view.

#### Scenario: Replay is running

- **WHEN** a matrix is in progress
- **THEN** Dashboard MUST render nine slots grouped by `closed`, `open-inactive`, and `target-active`
- **AND** pending, current, complete, incomplete, and warning states MUST be distinguishable without depending on color alone

#### Scenario: Replay results are available

- **WHEN** one or more formal records exist
- **THEN** Dashboard MUST show per-surface completion, elapsed mean/range, events/s, and MiB/s summaries
- **AND** per-record R1/R2/R3 coverage, drain, warnings, raw metadata, and output paths MUST remain available in expandable details

#### Scenario: Only one diagnostic source is enabled

- **WHEN** Recorder or Replay is independently source-disabled
- **THEN** the available step MUST remain usable without treating the absent step as an error
- **AND** disabled diagnostic modules MUST retain their existing release-elision behavior
