## MODIFIED Requirements

### Requirement: Workflow execution seams support agent-owned prepared results

Workflow preparation and apply seams SHALL expose reusable contracts for
preparing requests without dispatch and applying externally finalized results.

#### Scenario: Preparation can produce raw requests for handoff

- **WHEN** Host Bridge prepares an agent-owned workflow handoff
- **THEN** the preparation seam SHALL provide request payloads built from the
  explicit selection without starting provider execution.

#### Scenario: Apply helper accepts externally finalized bundle results

- **WHEN** Host Bridge applies an agent-owned finalized bundle
- **THEN** it SHALL invoke workflow `applyResult` through the same runtime
  contract used by Host-owned workflow execution.
