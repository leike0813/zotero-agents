## MODIFIED Requirements

### Requirement: Native RPC SHALL implement the complete grouped client surface

The native production adapter SHALL expose every operation in the closed grouped `SynthesisClient` production inventory through versioned, typed request and result contracts. The wire inventory SHALL be reconciled against all 131 public methods at `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`; every baseline method MUST have a migrated, merged, or Host-owned disposition with executable evidence. This change authorizes no removed disposition. The adapter MUST NOT accept arbitrary method names, expose repository/path/credential/host-object internals, or treat handler presence as behavioral readiness.

#### Scenario: Production client inventory is compared
- **WHEN** the native capability inventory is checked against the fixed baseline and grouped client
- **THEN** every production method has exactly one typed native route or explicit equivalent owner
- **AND** every baseline method has a non-deletion disposition and evidence ID

#### Scenario: Unknown native operation is requested
- **WHEN** a request names an operation outside the closed capability inventory
- **THEN** the service rejects it as `invalid_request` without dispatching application code

#### Scenario: Listed route has no real implementation
- **WHEN** a route cannot produce its baseline-backed projection or effect
- **THEN** it returns a stable unavailable result without fabricated success fields or side effects

### Requirement: Production operation deadlines SHALL be manifest owned

The shared production operation manifest SHALL define an operation-specific control-plane deadline and work model for every production capability. Bounded reads and short mutations SHALL complete within that deadline. Full-library and worker-backed mutations SHALL return an accepted public operation receipt within the short control-plane deadline and continue only through bounded operation phases with explicit progress, cancellation, retry, and terminal state. TypeScript and Rust routes MUST resolve the same policy from the manifest.

#### Scenario: Long native work is accepted
- **WHEN** a caller starts Reference refresh/matching, Citation rebuild/refresh/metrics/layout, a knowledge-index rebuild, or WebDAV sync
- **THEN** the route returns the existing public operation receipt without holding the RPC until terminal completion
- **AND** subsequent progress and terminal reads use the operation API

#### Scenario: Native operation reaches a phase deadline
- **WHEN** bounded work exceeds its phase deadline before promotion
- **THEN** Rust records `operation_timeout` and preserves the prior usable state
- **AND** no unreported commit occurs after the caller observes timeout

#### Scenario: Ordinary operation resolves its deadline
- **WHEN** a bounded read or short mutation has no override
- **THEN** its effective deadline comes from the shared manifest

## ADDED Requirements

### Requirement: Production routes SHALL use typed domain ownership

Production routing SHALL limit the central dispatcher to authentication, manifest policy, typed dispatch, and stable error mapping. Domain DTO reconstruction SHALL be owned by typed adapters; business rules by application services; SQL by repositories; and Zotero/WebDAV/effect calls by reverse-Host ports. Route-local fallback parsing and business-state fabrication are forbidden.

#### Scenario: Domain operation is dispatched
- **WHEN** a valid production operation reaches Rust
- **THEN** one typed domain adapter invokes its application port
- **AND** the adapter does not directly invent missing domain state or bypass validation

#### Scenario: DTO is invalid
- **WHEN** a request cannot be rebuilt as its strict operation DTO
- **THEN** it fails before repository, canonical, worker, or Host side effects

### Requirement: Production wire policy SHALL distinguish control data from content

Ordinary metadata and page DTOs SHALL target no more than 768 KiB and MUST NOT exceed 1 MiB. Valid large Topic assets, artifact bodies, review inputs, and exports SHALL use the existing authenticated locator, transfer, or delivery path and MUST NOT be rejected solely because their content cannot fit the general JSON envelope.

#### Scenario: Large Topic result is applied
- **WHEN** a valid Topic result contains assets above the general request limit and within Topic content bounds
- **THEN** the client transfers hash-bound assets and sends a bounded control manifest
- **AND** Rust validates and applies the same public semantic input

#### Scenario: Large artifact is read
- **WHEN** an artifact body is valid but larger than the general response limit
- **THEN** the operation returns or resolves it through the approved content path
- **AND** the control response remains within its metadata bound
