## ADDED Requirements

### Requirement: Citation Graph failures SHALL preserve public identity across transport boundaries
The sidecar SHALL record handler failure separately from HTTP response-write outcome and SHALL map basis mismatch, repository schema incompatibility, repository unavailability, response size limit, and schema mismatch to stable public codes and appropriate HTTP statuses. The TypeScript client SHALL preserve the sidecar code and a bounded safe sidecar reason.

#### Scenario: A Graph response exceeds the runtime budget
- **WHEN** a Graph handler cannot reduce a response below the allowed size
- **THEN** the caller receives `response_body_too_large` with a safe bounded reason instead of a bare `internal_error`

#### Scenario: A cursor basis is stale
- **WHEN** a Graph handler returns `basis_mismatch`
- **THEN** diagnostics and the TypeScript client preserve `basis_mismatch` while independently recording whether the HTTP error response was written

