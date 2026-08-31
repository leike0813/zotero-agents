## ADDED Requirements

### Requirement: Public synthesis client remains unchanged
Routing metrics through the sidecar SHALL be an internal production-composition
decision and SHALL NOT add a public `SynthesisClient` method or change Workbench
callers.

#### Scenario: Public client inventory is checked
- **WHEN** the production metrics route is enabled
- **THEN** the public client surface remains at 108 methods with one direct consumer

### Requirement: Internal metrics adapter is fail closed
The internal sidecar metrics engine adapter SHALL use the authenticated compute
client and SHALL NOT expose retry or fallback behavior to production callers.

#### Scenario: Compute transport fails
- **WHEN** the authenticated metrics request fails in transport or worker execution
- **THEN** the adapter returns the stable internal error and does not invoke the in-process engine
