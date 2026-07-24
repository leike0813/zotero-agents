## ADDED Requirements

### Requirement: Host Bridge service SHALL route workflow queue and submission resources
The authenticated HTTP v1 service SHALL route pending queue list/cancel and active submission inspection through the workflow control module.

#### Scenario: Authenticated queue request
- **WHEN** a bearer-authenticated client calls a workflow queue or submission route
- **THEN** the service SHALL parse only declared filters/body fields and return the workflow-control result envelope

#### Scenario: Unauthenticated queue request
- **WHEN** a caller omits or fails bearer authentication
- **THEN** the service SHALL reject the request before reading or mutating queue state
