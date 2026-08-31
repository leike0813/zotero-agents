## ADDED Requirements

### Requirement: Private Citation Graph application does not change production routing
The migration inventory SHALL retain 108 public methods, one direct consumer, eight production engine owners, two production worker routes, production graph build in-process, and sidecar production mutation disabled.

#### Scenario: Governance detects accidental graph cutover
- **WHEN** the change adds a public graph application capability, automatic invocation, production route, fallback, direct consumer, engine transfer, or mutation enablement
- **THEN** invariant verification fails
