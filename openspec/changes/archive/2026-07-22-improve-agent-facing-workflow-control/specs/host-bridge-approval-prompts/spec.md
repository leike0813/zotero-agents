## ADDED Requirements

### Requirement: Sidecar and graph maintenance approvals SHALL be independent
Reference-sidecar refresh and citation-graph update SHALL each require a separate human-readable approval describing the requested paper or library scope.

#### Scenario: Sidecar approval is granted
- **WHEN** sidecar refresh completes after approval
- **THEN** a later graph update still requires its own approval
- **AND** the earlier approval is not reused for graph mutation.
