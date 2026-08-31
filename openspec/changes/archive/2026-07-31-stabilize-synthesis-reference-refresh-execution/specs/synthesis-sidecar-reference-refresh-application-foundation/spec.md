## MODIFIED Requirements

### Requirement: Materialized refresh input SHALL remain batch bounded

Before retaining or applying prepared payloads, both Reference Refresh implementations SHALL rebuild and validate each source-scoped apply request against a materialized batch limit derived from two maximum `library.artifacts.read` responses plus a fixed JSON envelope allowance. The corresponding JSON-node limit SHALL be derived from the same two-artifact basis. Preparation requests SHALL remain bounded at 8 MiB and 250,000 JSON nodes.

#### Scenario: Multiple legal artifact responses exceed the former aggregate bound
- **WHEN** changed source artifacts collectively exceed 8 MiB but each source-scoped apply batch remains within the materialized batch limits
- **THEN** refresh promotes the sources through one or more bounded batches
- **AND** the active index exposes every successfully promoted source

#### Scenario: One source contributes two maximum legal artifacts
- **WHEN** one source's references and citation-analysis responses together exceed 8 MiB but remain within the derived materialized batch limits
- **THEN** the source can be validated and transactionally promoted

#### Scenario: One source exceeds the materialized batch limits
- **WHEN** a single source's rebuilt apply request exceeds either configured materialized limit
- **THEN** refresh returns `reference_refresh_payload_too_large` scoped to that source
- **AND** the failure reports measured and configured bytes and JSON nodes without retaining a preparation

### Requirement: Projection promotion is transactional and scope-aware

The repository SHALL project raw references, canonical references, redirects, deterministic bindings, artifact state, and application state using one expected-basis SQLite transaction after parsing outside the transaction. A production refresh SHALL sort sources by stable `paper_ref`, promote at most 100 sources per source-scoped batch, and use the latest active reference hash for each batch CAS. Full scope SHALL be used only as a no-payload final sweep after every current source has converged.

#### Scenario: Source refresh retains unrelated rows
- **WHEN** a scoped refresh promotes rows for a subset of sources
- **THEN** rows and protected decisions owned by all other sources remain unchanged

#### Scenario: Transaction failure retains last-good projection
- **WHEN** projection validation, the second basis check, or any SQL statement fails before a batch commit
- **THEN** the batch leaves the active hash, counts, readiness, and all previously committed rows unchanged

#### Scenario: User decisions survive replacement
- **WHEN** refreshed raw facts overlap manual bindings, redirects, rejected proposals, or user decisions
- **THEN** those protected facts remain authoritative

#### Scenario: Protected stale canonical is reviewable
- **WHEN** refreshed raw facts invalidate a protected canonical assignment
- **THEN** the canonical remains protected and a canonical-revision review row is persisted without exposing generic review actions

#### Scenario: Measured multi-source batch exceeds capacity
- **WHEN** a rebuilt multi-source apply request exceeds its byte or JSON-node limit
- **THEN** the coordinator discards the preparation, splits the stable source list, and retries bounded child batches

### Requirement: Reference Refresh execution SHALL converge through durable source batches

Production Reference Refresh SHALL retain each successful source batch, stop admitting new batches when its operation deadline is exhausted, and return bounded `processed_paper_refs`, `failed_paper_refs`, and `retryable` fields when execution is incomplete. Retry SHALL skip sources whose current descriptor hashes already match the active projection.

#### Scenario: A later source fails
- **WHEN** one source fails after an earlier batch has promoted
- **THEN** the earlier batch remains readable
- **AND** the failed source retains its last-good rows
- **AND** no full-scope sweep executes

#### Scenario: Retry follows partial success
- **WHEN** the caller retries after a partial result and completed sources have not changed
- **THEN** only failed, missing, or newly stale sources are materialized
- **AND** the refresh converges without rereading completed source payloads

#### Scenario: Deadline expires between batches
- **WHEN** the operation deadline is exhausted after one or more batches commit
- **THEN** no new batch is prepared
- **AND** completed batches remain active for a later retry

#### Scenario: Every current source converges
- **WHEN** every enumerated source is current and all source batches succeed
- **THEN** one no-payload full-scope sweep removes rows for sources no longer present in Zotero

