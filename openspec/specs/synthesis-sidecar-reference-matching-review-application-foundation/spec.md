# synthesis-sidecar-reference-matching-review-application-foundation Specification

## Purpose
Defines the application-level foundation for the Synthesis sidecar reference matching review component, including its service boundary, lifecycle, and integration with the sidecar runtime.

## Requirements

### Requirement: Matching and review contracts SHALL be strict and bounded

The system SHALL expose JSON-safe private matching/review request, result, proposal-page, preparation, decision, state, and lifecycle DTOs that reject unknown fields, malformed identifiers, invalid states/actions, duplicate decisions, and values outside the existing matcher/application bounds.

#### Scenario: Malformed matching input is rejected
- **WHEN** a caller supplies an oversized, non-JSON-safe, duplicate, or structurally invalid matching request
- **THEN** the application SHALL return or throw the stable strict-contract failure before engine or repository mutation

### Requirement: Matching SHALL use a two-stage basis-bound protocol

The system SHALL prepare both matcher-engine passes from one materialized Host snapshot and captured active reference basis, then apply the prepared result only when the recaptured Host basis and active reference hash remain equal to the preparation.

#### Scenario: Matching bases remain current
- **WHEN** apply receives the single-use preparation id, the same Host-basis hash, and the repository still exposes the captured reference hash
- **THEN** the application SHALL transactionally promote the matching result and consume the preparation

#### Scenario: Host or repository basis is superseded
- **WHEN** the recaptured Host hash or active reference hash differs from the preparation
- **THEN** apply SHALL fail without changing proposals, bindings, redirects, or last-good readiness

### Requirement: Matching SHALL preserve precision-first materialization

The system SHALL persist deterministic/high Zotero bindings and safe deterministic canonical redirects automatically, preserve suggested, ambiguous, fuzzy, and semantic-risk candidates as bounded proposals, and suppress regeneration of rejected proposals only for the same kind, basis hash, and source hash.

#### Scenario: Weak candidate remains review-only
- **WHEN** either matcher pass returns a non-automatic candidate
- **THEN** the application SHALL persist an open proposal without creating an accepted binding or redirect

#### Scenario: Rejected basis is encountered again
- **WHEN** a later matching preparation produces the same rejected proposal kind, basis hash, and source hash
- **THEN** apply SHALL preserve the rejected decision and SHALL NOT reopen or duplicate the proposal

### Requirement: Proposal review SHALL atomically govern derived facts

The system SHALL support accept, reverse accept, reject, reopen, logical delete, and manual target decisions across `open`, `accepted`, `rejected`, `superseded`, and `retargeted` proposals, with each proposal transition and its derived binding/redirect creation or revocation committed atomically.

#### Scenario: Accepted proposal is reopened or rejected
- **WHEN** a caller reopens, rejects, or deletes an accepted proposal
- **THEN** the application SHALL revoke the fact produced by that proposal in the same transaction and return the affected graph-fact delta

#### Scenario: Proposal is manually retargeted
- **WHEN** a valid manual Zotero-item or canonical-reference target is supplied
- **THEN** the application SHALL revoke any prior accepted fact, persist the manual fact plus audit proposal, and mark the original proposal retargeted

### Requirement: Batch review SHALL preserve partial-success semantics

The system SHALL validate and apply each decision independently, keep each successful decision committed when another decision fails, and return bounded applied, skipped, failed, result, and aggregate-delta fields.

#### Scenario: One batch decision is invalid
- **WHEN** a batch contains valid decisions and one missing or invalid proposal decision
- **THEN** valid decisions SHALL remain committed and the result SHALL identify the failed decision without throwing away successful results

### Requirement: Matching/review state SHALL be durable and CAS-safe

The isolated repository SHALL persist proposal rows, matching state, operation receipts, accepted facts, redirects, and review decisions across restart, while matching promotion SHALL use the active reference hash as its transactional compare-and-swap basis.

#### Scenario: Service restarts after completed review
- **WHEN** the private service closes and reopens the same isolated repository
- **THEN** proposal states and their accepted or revoked facts SHALL remain observable through bounded reads

### Requirement: Downstream effects SHALL remain outside the private application

The private application SHALL return bounded changed canonical/binding/redirect deltas and mark graph/related projections stale when accepted facts change, but SHALL NOT execute graph refresh, layout, related-items synchronization, Host writes, or production fallback.

#### Scenario: Accepted fact changes
- **WHEN** matching or review changes an accepted binding or redirect
- **THEN** the private repository SHALL record downstream staleness and the application SHALL return the bounded delta without invoking a downstream effect

### Requirement: Private composition SHALL preserve lifecycle and production boundaries

The service SHALL compose the matching/review application after isolated repository recovery, keep bounded reads available during matching work, fail competing mutations immediately, discard outstanding preparation during shutdown, and expose no new HTTP/RPC, `SynthesisClient`, automatic invocation, or production persistence route.

#### Scenario: Shutdown occurs with an outstanding preparation
- **WHEN** shutdown begins while one matching preparation exists
- **THEN** admission SHALL stop, the preparation SHALL be discarded, active work SHALL drain, and the repository SHALL close without a partial promotion

### Requirement: Matching application SHALL receive a Rust pool adapter

Private reference matching composition SHALL inject a pool-backed matcher engine implementing the existing application port and SHALL preserve preparation, basis recapture, single-use promotion, review, and repository transaction semantics.

#### Scenario: Rust matcher fails before apply

- **WHEN** either matcher operation is canceled, times out, crashes, or returns invalid output
- **THEN** preparation SHALL fail without changing proposals, bindings, redirects, or readiness
- **AND** no in-process fallback SHALL run.

### Requirement: Canonical merge review SHALL apply component intent atomically

Accept, reverse accept, and manual canonical target decisions SHALL be planned against the current effective redirect component rather than the selected proposal status alone. A newer explicit decision SHALL displace conflicting materialized facts and their accepted proposal state in the same transaction.

#### Scenario: Open duplicate is reverse accepted after a sibling was accepted
- **WHEN** one proposal has materialized `source -> target` and an open sibling for the same pair is reverse accepted
- **THEN** the application SHALL make `source` the effective canonical
- **AND** remove the conflicting forward fact
- **AND** supersede the displaced accepted sibling
- **AND** persist the reverse audit as accepted in one transaction.

#### Scenario: Reverse is repeated
- **WHEN** the requested canonical is already the root selected by the same reverse decision
- **THEN** the application SHALL return idempotent success without adding another redirect or audit proposal.

#### Scenario: Review proposals become redundant
- **WHEN** a committed decision makes an open canonical merge proposal semantically redundant within the same resolved component
- **THEN** the application SHALL supersede that proposal so the user is not asked to resolve an already-settled relationship.
