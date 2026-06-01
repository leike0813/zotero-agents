# synthesis-layer-engineering-contracts Specification

## Purpose

Historical engineering contract capability superseded by `synthesis-layer-doc-system`.

## Requirements

### Requirement: Engineering contract split SHALL be treated as historical

The previous split engineering contract capability SHALL no longer be the active Synthesis documentation contract.

#### Scenario: Developer needs active machine-readable Synthesis contracts

- **WHEN** a developer needs stable state, event, or invariant IDs
- **THEN** they use the reduced consolidated Synthesis contract YAML files
- **AND** they do not treat this superseded change as the active design source.
