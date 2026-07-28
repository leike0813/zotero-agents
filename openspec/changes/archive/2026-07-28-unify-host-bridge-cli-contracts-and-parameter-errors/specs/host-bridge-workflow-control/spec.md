## ADDED Requirements

### Requirement: Workflow control routes SHALL use the Host Bridge v2 namespace
All authenticated workflow, run, notification, permission, context, upload, diagnostic, and queue routes owned by Host Bridge workflow control SHALL be served under `/bridge/v2`.

#### Scenario: v2 client invokes workflow control
- **WHEN** an authenticated v2 client invokes a declared workflow-control route
- **THEN** Host Bridge SHALL preserve the route's existing domain behavior and return a v2 protocol envelope.

#### Scenario: Client invokes the removed v1 route
- **WHEN** a client invokes the corresponding `/bridge/v1` route
- **THEN** Host Bridge SHALL NOT treat it as a supported v2 endpoint.
