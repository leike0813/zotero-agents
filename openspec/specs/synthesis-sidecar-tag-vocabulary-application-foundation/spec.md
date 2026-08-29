# synthesis-sidecar-tag-vocabulary-application-foundation Specification

## Purpose

Define typed Rust parity, Host-effect handling, and supersession safety for Tag Vocabulary operations.

## Requirements

### Requirement: Tag Vocabulary SHALL have typed Rust application parity
The private Rust candidate SHALL implement strict Tag inspection, vocabulary and staged mutation, validation, promotion, index, audit, effect receipt, and lifecycle behavior over typed repository, compute, Host-effect, and legacy-binding ports.

#### Scenario: Host dispatch fails after promotion
- **WHEN** vocabulary and effect rows commit successfully but the injected Host-effect port fails
- **THEN** the committed Tag state remains visible
- **AND** the result carries the same stable warning and pending-effect state as the Node oracle

#### Scenario: Tag work is superseded or stopped
- **WHEN** a CAS basis changes, a worker fails, or shutdown starts during work
- **THEN** the last-good aggregate and index remain intact
- **AND** shutdown rejects new admission and drains active work before close
