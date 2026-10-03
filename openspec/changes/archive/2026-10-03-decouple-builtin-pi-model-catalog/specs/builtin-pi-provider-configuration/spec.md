## MODIFIED Requirements

### Requirement: Static catalog and declarative overlay remain safe offline

The system SHALL use a pinned official Pi seed and the last compatible public snapshot offline. A sanitized read-only overlay SHALL supplement applicable facts without changing saved connections, widening known hard limits, enabling unsupported execution or restoring retired models. Failed or missing overlay reads SHALL preserve adopted declarations until explicit removal. No credential-bearing or executable declaration SHALL be adopted.

#### Scenario: Invalid overlay follows a valid refresh
- **WHEN** an adopted overlay is followed by a secret, executable field, duplicate identity or illegal override
- **THEN** the refresh fails and the previous declarations and effective directory remain available

#### Scenario: Unknown model has no inferred capability
- **WHEN** a model lacks a necessary capability
- **THEN** that fact remains unknown and cannot establish execution requiring that capability

### Requirement: Frozen selection contains no credential material

Each turn SHALL receive an immutable target/auth-applicable metadata snapshot including safe binding identity, source/schema/catalog and execution versions, reasoning mapping, capabilities, constraints, compat and pricing. Unsupported explicit reasoning SHALL fail locally. Canonical snapshots SHALL contain no secret, authorization header, SDK object or private absolute path.

#### Scenario: Configuration changes after selection
- **WHEN** configuration, defaults or catalog facts change after selection
- **THEN** the active turn retains its frozen facts and future turns independently validate their actual selection

## ADDED Requirements

### Requirement: Public directory updates are independent and bounded
The system SHALL check the official public directory without credentials using the actual runtime version, a 30-second timeout and an 8-MiB streamed limit. Four-hour automatic checks SHALL follow recent attempt time and be optional. Manual checks SHALL bypass the interval. Loading configuration, selectors and starting tasks SHALL remain offline. Only a fully validated and persisted candidate SHALL publish.

#### Scenario: Candidate fails validation or persistence
- **WHEN** a response has invalid known fields, duplicate identities, incompatible structure, cancellation or write failure
- **THEN** the previous effective data remains and a safe source failure is published

#### Scenario: Empty or conditional response
- **WHEN** a compatible empty catalog or a matching 304 arrives
- **THEN** empty data replaces public recommendations, while 304 retains the matching body and updates check time only

#### Scenario: Conditional response has no usable body
- **WHEN** 304 arrives without its matching compatible cached body
- **THEN** at most one full request is attempted and no invalid body is adopted

### Requirement: Public recovery preserves independent facts
The system SHALL retain current, previous and seed public data, validate cache on load and fall back in that order. Manual recovery SHALL persist before publication and disable automatic checks. Recovery SHALL preserve overlay, connections, account visibility, history and known retirement constraints. Missing public models SHALL remain separately described for existing configurations without becoming public recommendations.

#### Scenario: Rollback follows retirement
- **WHEN** a user restores a previous snapshot containing a now explicitly retired model
- **THEN** the model remains blocked for new turns and unrelated sources retain their facts

### Requirement: Source ownership prevents late or competing publication
The system SHALL share in-flight refreshes within each source scope, serialize source commits using current independent facts and reject obsolete generations. Removing overlay, restoring public data, credential replacement and shutdown SHALL invalidate affected work. Window closure SHALL release its waiter without canceling work needed by others. Account discovery SHALL persist safe identity-scoped descriptions and distinguish failed observations from valid empty results.

#### Scenario: Independent sources complete concurrently
- **WHEN** public and account refreshes finish in either order
- **THEN** the resulting directory contains both current facts without losing one source's update

#### Scenario: Account identity changes during discovery
- **WHEN** a credential is removed or replaced before discovery publishes
- **THEN** its obsolete result cannot restore availability, while ordinary token renewal retains the same discovery identity

### Requirement: Saved connections and source maintenance remain explicit
The system SHALL retain versioned validated connection bindings and configured model descriptions across directory changes. Source updates SHALL NOT redirect credentials or change authentication. Official seed preparation SHALL be explicit and reproducible; daily public compatibility monitoring SHALL use the same normalizer without accounts, model calls or automatic SDK/seed changes.

#### Scenario: Upstream changes an endpoint
- **WHEN** updated catalog metadata suggests another target for a saved configuration
- **THEN** its existing binding remains and the change requires explicit user acceptance
