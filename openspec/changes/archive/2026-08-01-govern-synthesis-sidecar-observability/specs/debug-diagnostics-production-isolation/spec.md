## MODIFIED Requirements

### Requirement: Production SHALL elide sidecar debug machinery

With debug disabled, production SHALL not construct success events, propagate
trace context, parse structured stderr, retain tails or trace stores, register
subscriptions, or publish sidecar UI patches. Business failure incidents SHALL
remain available.

#### Scenario: Release-elision gate runs
- **WHEN** the production bundle is inspected
- **THEN** all debug-only markers and module bytes are absent
- **AND** the business audit module remains present
