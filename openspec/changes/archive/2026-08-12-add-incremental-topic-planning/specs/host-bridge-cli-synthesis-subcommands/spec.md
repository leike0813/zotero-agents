## ADDED Requirements

### Requirement: CLI exports topic planning context
The CLI SHALL provide `synthesis topic get-planning-context` as a read-only command that returns or writes the bounded library index, topic inventory, graph snapshot and hash, stored planning metadata, coverage inputs, and library index hash required by Topic Planner.

#### Scenario: Inline output is bounded
- **WHEN** the planning context fits the response boundary
- **THEN** the command returns the context in its normal structured output

#### Scenario: Local output path is requested
- **WHEN** the caller supplies `--output-path` in a local bridge session
- **THEN** the complete context is written to that path and the response identifies the file

#### Scenario: Remote output exceeds transport bounds
- **WHEN** a remote bridge cannot directly write the caller's local path or the payload exceeds inline limits
- **THEN** the command returns a downloadable product reference compatible with the existing file-download flow

