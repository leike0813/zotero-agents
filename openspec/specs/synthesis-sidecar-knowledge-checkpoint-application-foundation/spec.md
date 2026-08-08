# synthesis-sidecar-knowledge-checkpoint-application-foundation Specification

## Purpose

Define typed Rust parity and basis-guarded replacement for Knowledge Checkpoints.

## Requirements

### Requirement: Knowledge Checkpoint SHALL expose typed Rust parity
The Rust application SHALL deterministically build and verify checkpoints, preview complete replacement, preserve user-decision override reporting, consume one receipt once, and apply all knowledge aggregates with expected-basis CAS.

#### Scenario: Checkpoint replacement loses its basis
- **WHEN** the repository basis changes after preview or any row write fails
- **THEN** the Rust application returns the same stable supersession or failure observation as Node
- **AND** no knowledge aggregate is partially replaced
- **AND** operational rows remain preserved
