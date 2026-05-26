## ADDED Requirements

### Requirement: UI snapshot reads do not write foundation state

Synthesis foundation state SHALL only be mutated by explicit write, rebuild, or
job operations.

#### Scenario: Workbench snapshot is read

- **WHEN** the Workbench reads a Synthesis snapshot
- **THEN** canonical store receipts, events, diagnostics, and projection
  registry state SHALL remain unchanged.
