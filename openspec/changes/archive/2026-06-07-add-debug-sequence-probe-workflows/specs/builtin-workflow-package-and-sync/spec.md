## ADDED Requirements

### Requirement: Builtin debug probe package includes sequence probes

The builtin workflow sync manifest SHALL include the debug sequence probe
workflow package resources.

#### Scenario: Debug sequence package is synchronized

- **WHEN** builtin workflows are synchronized from packaged resources
- **THEN** the `workflow-debug-probe` package SHALL contain the original debug
  probe workflow
- **AND** it SHALL contain the linear, workspace reuse, and context isolation
  sequence probe workflows.
