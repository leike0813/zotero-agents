## ADDED Requirements

### Requirement: Topic application foundation does not change production routing
The migration inventory SHALL retain 108 public methods, one direct consumer, eight production engine owners, two production worker routes, and production mutation disabled in the sidecar.

#### Scenario: Governance detects accidental cutover
- **WHEN** the change adds a production sidecar Topic route, public method, direct service consumer, engine transfer, or mutation enablement
- **THEN** invariant verification fails
