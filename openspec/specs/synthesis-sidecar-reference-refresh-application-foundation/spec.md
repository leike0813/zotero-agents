# synthesis-sidecar-reference-refresh-application-foundation Specification

## Purpose
Defines the application-level foundation for the Synthesis sidecar reference refresh component, including its service boundary, lifecycle, and integration with the sidecar runtime.

## Requirements

### Requirement: Strict private Reference Refresh application surface

The sidecar SHALL expose only the private application methods `inspect`, `readSources`, `readReferences`, `prepareRefresh`, `applyRefresh`, `discardPreparation`, `stopAdmission`, and `shutdown`, with strict request rebuilding, unknown-field rejection, stable results, and bounded reads.

#### Scenario: Public protocol remains unchanged
- **WHEN** the private application is composed
- **THEN** no HTTP or RPC capability, `SynthesisClient` route, production fallback, or automatic invocation is added

#### Scenario: Read bounds are enforced
- **WHEN** a source or reference page exceeds its declared maximum or contains an invalid cursor
- **THEN** the application rejects the request as `invalid_request` without reading an unbounded projection

### Requirement: Refresh preparation derives an exact changed-artifact read plan

`prepareRefresh` SHALL accept only an expected reference hash, force flag, full or at-most-100-source scope, stable unique library item summaries, and complete digest, references, and citation-analysis descriptors for every scoped source. It SHALL enforce the 8 MiB and 250,000-JSON-node admission bounds and compute a canonical input hash.

#### Scenario: Only changed artifacts are planned
- **WHEN** references descriptors differ from the active projection
- **THEN** the preparation plans those references payloads and plans citation-analysis payloads only for the same sources whose references changed

#### Scenario: Digest remains descriptor-only
- **WHEN** digest status or hash changes
- **THEN** digest contributes to freshness and the canonical input hash but no digest payload read is planned

#### Scenario: Existing basis is required for updates
- **WHEN** an active projection exists and the expected reference hash is null or differs from it
- **THEN** preparation returns `basis_mismatch` and creates no projection writes

#### Scenario: Identical input can remain unchanged
- **WHEN** the canonical input hash matches the active input hash and force is false
- **THEN** preparation returns `unchanged` without creating a materialization plan

### Requirement: Prepared payload materialization is exact and single-use

`applyRefresh` SHALL accept payloads only for the active preparation and SHALL reject missing, extra, duplicate, locator-mismatched, hash-mismatched, or stale results before any projection write. A preparation SHALL be consumed by successful apply, failed apply, or explicit discard.

#### Scenario: Exact payload promotes
- **WHEN** every planned payload is present exactly once and remains bound to its planned locator, expected hash, and active reference basis
- **THEN** the application projects the payloads and attempts one transactional CAS promotion

#### Scenario: Invalid materialization preserves last-good state
- **WHEN** any planned payload is missing, extra, duplicated, stale, or mismatched
- **THEN** apply returns `payload_stale` or `invalid_request`, consumes the preparation, and performs zero projection writes

#### Scenario: Discard is final
- **WHEN** a preparation is discarded and its identifier is later applied
- **THEN** the application returns `preparation_missing`

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

### Requirement: Downstream state changes only for graph-relevant facts

After a successful promotion the repository SHALL mark the reference basis ready and SHALL mark graph and related-item projections stale only when graph-relevant reference facts changed. The result SHALL include a bounded delta and SHALL NOT execute graph rebuilds or Host effects.

#### Scenario: Metadata-only refresh does not stale downstream projections
- **WHEN** a promoted refresh changes no graph-relevant reference fact
- **THEN** existing graph and related-item readiness remain unchanged

#### Scenario: Graph fact change returns bounded invalidation
- **WHEN** a promoted refresh changes graph-relevant reference facts
- **THEN** graph and related-item readiness become stale and the result reports a bounded affected-source delta without invoking either projection

### Requirement: Stable bounded reads and restart persistence

`inspect`, `readSources`, and `readReferences` SHALL return stable ordered pages backed by the persisted active projection. Application state, rows, operations, readiness, and hashes SHALL survive repository restart.

#### Scenario: Stable source and reference pagination
- **WHEN** callers traverse pages using returned cursors
- **THEN** each active row appears in deterministic order without duplication within the unchanged basis

#### Scenario: Restart restores active projection
- **WHEN** the service restarts after a successful promotion
- **THEN** inspection and bounded reads expose the same active reference hash, input hash, counts, and rows

### Requirement: Serialized lifecycle preserves responsive reads

The application SHALL admit at most one outstanding preparation or active apply. Competing mutations SHALL fail immediately as `reference_refresh_busy`; reads SHALL remain available. `stopAdmission` and `shutdown` SHALL reject new mutations as `stopping`, discard an outstanding preparation, drain active apply work, and complete before repository closure.

#### Scenario: Preparation blocks a competitor
- **WHEN** a preparation exists and another prepare request arrives
- **THEN** the competitor returns `reference_refresh_busy` while inspection and bounded reads remain responsive

#### Scenario: Shutdown drains safely
- **WHEN** shutdown begins with a preparation or active apply
- **THEN** the preparation is discarded, new admission returns `stopping`, active promotion is awaited, and the repository is not closed early

### Requirement: Failure vocabulary and post-commit warnings are stable

Mutation results SHALL use only `prepared`, `promoted`, `unchanged`, `basis_mismatch`, `reference_refresh_busy`, `preparation_missing`, `payload_stale`, `invalid_request`, `projection_failed`, `repair_required`, and `stopping`. Repository corruption SHALL fail closed, and operation-receipt failure after commit SHALL preserve success with a stable warning.

#### Scenario: Pre-commit failure cannot alter active state
- **WHEN** validation, projection, or transaction work fails before promotion
- **THEN** the result uses the stable failure vocabulary and the prior active projection remains complete

#### Scenario: Receipt failure follows committed truth
- **WHEN** projection commit succeeds but terminal operation receipt persistence fails
- **THEN** the result remains `promoted` with a stable warning and inspection exposes the committed basis

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
