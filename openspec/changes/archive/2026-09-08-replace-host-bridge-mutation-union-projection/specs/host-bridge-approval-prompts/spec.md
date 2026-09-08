## ADDED Requirements

### Requirement: Typed mutation approvals describe prepared actions
Typed execute projections SHALL use the existing canonical preflight, approval, and post-approval revalidation flow. Typed preview projections SHALL not create approval requests.

#### Scenario: Typed execute requires approval
- **WHEN** a typed mutation execute request reaches an approval boundary
- **THEN** the prompt describes the canonical prepared action without raw JSON, paths, leases, or private tokens.
