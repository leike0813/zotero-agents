## ADDED Requirements

### Requirement: Harness SHALL preserve Workbench surface refresh protocol semantics

The readonly UI harness SHALL preserve Synthesis Workbench surface generation
and transient-error semantics when it relays or mocks surface messages.

#### Scenario: Harness surface response is stale

- **WHEN** the harness sends a Synthesis surface response with older request
  metadata than the latest accepted response
- **THEN** the original Workbench frontend SHALL ignore it
- **AND** the harness SHALL NOT compensate by injecting fake data.

#### Scenario: Harness read fails transiently

- **WHEN** a harness-backed readonly surface read fails transiently
- **THEN** the page SHALL show the same diagnostic/last-known-good behavior as
  the plugin-hosted Workbench.
