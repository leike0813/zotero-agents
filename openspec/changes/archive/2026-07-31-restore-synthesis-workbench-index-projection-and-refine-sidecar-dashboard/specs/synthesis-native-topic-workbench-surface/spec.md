## MODIFIED Requirements

### Requirement: Topic and Workbench operations SHALL preserve the public contract

The native compatibility boundary SHALL implement exactly the operations assigned by the R9a operation-ownership matrix. Requests, results, pagination, optional-field behavior, and stable error categories MUST remain compatible with the public `SynthesisClient` contract. Internal operational Workbench DTOs MUST be adapted to the public UI projection and MUST NOT be returned as a surface result.

#### Scenario: Workbench chrome is read

- **WHEN** a caller invokes `client.getSynthesisWorkbenchChromeInput`
- **THEN** Rust returns `maintenance.summary` and `maintenance.backgroundJobs`
- **AND** it does not require the UI to interpret the internal `cacheReadiness` list

#### Scenario: Workbench Index is read after refresh

- **WHEN** Reference Refresh has committed a ready cache basis and the caller invokes the Index surface
- **THEN** Rust returns `registry.cacheStatus` and current-library-backed `registry.rows`
- **AND** a repeated surface read returns the same ready projection without another refresh

#### Scenario: Internal and public request shapes differ

- **WHEN** the public method omits basis hashes or worker payload details owned by the runtime
- **THEN** the compatibility boundary derives them from a coherent native snapshot
- **AND** it does not require the caller to supply internal application fields
