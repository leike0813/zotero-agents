## MODIFIED Requirements

### Requirement: Topic and Workbench operations SHALL preserve the public contract

The native compatibility boundary SHALL implement exactly the operations assigned by the R9a operation-ownership matrix. Requests, results, pagination, optional-field behavior, and stable error categories MUST remain compatible with the public `SynthesisClient` contract. Internal operational and persistence DTOs MUST be adapted to the public UI projection and MUST NOT be returned as a surface result. Every Workbench surface result MUST satisfy the recursively concrete capability result definition selected by the original surface and Review-tab request. Home and Topics MUST remain readable without decoding complete historical Topic bundles, and Review projections MUST expose closed decision DTOs rather than stored proposal payloads.

#### Scenario: Workbench chrome is read

- **WHEN** a caller invokes `client.getSynthesisWorkbenchChromeInput`
- **THEN** Rust returns `maintenance.summary` and `maintenance.backgroundJobs`
- **AND** it does not require the UI to interpret the internal `cacheReadiness` list

#### Scenario: Workbench Index is read after refresh

- **WHEN** Reference Refresh has committed a ready cache basis and the caller invokes the Index surface
- **THEN** Rust returns `registry.cacheStatus` and current-library-backed `registry.rows`
- **AND** a repeated surface read returns the same ready projection without another refresh

#### Scenario: Every Workbench surface is read through native composition

- **WHEN** a caller reads Home, Topics, Index, Graph, Tags, Concepts, Reader, or any Review tab through the native client
- **THEN** the Rust result passes the request-selected public capability result definition
- **AND** the result remains consumable by the shared Workbench UI snapshot adapter

#### Scenario: A non-empty Citation Graph is read

- **WHEN** Reference Refresh and Citation Graph rebuild have committed a graph containing nodes and edges
- **THEN** the Graph result passes native capability validation without dropping its mixed-case public fields
- **AND** UI projection retains visible nodes and edges

#### Scenario: Historical Topics are listed in Workbench

- **WHEN** stable Topic application state points to a historical bundle that cannot decode as the current full Topic record
- **THEN** Home and Topics return the lightweight Topic identity, readiness, counts, and status required by the UI
- **AND** the read does not migrate or deserialize the complete historical definition, resolver, or projection payload

#### Scenario: Persisted Review rows are read

- **WHEN** Reference, Concept, or Topic Graph Review contains non-empty persisted rows
- **THEN** the native projection returns the closed DTO selected for that Review tab
- **AND** storage-only proposal, candidate, representative, raw sample, and source-record fields do not cross the boundary
- **AND** an absent manifest identity is returned as `null` rather than an empty hash

#### Scenario: Internal and public request shapes differ

- **WHEN** the public method omits basis hashes or worker payload details owned by the runtime
- **THEN** the compatibility boundary derives them from a coherent native snapshot
- **AND** it does not require the caller to supply internal application fields
