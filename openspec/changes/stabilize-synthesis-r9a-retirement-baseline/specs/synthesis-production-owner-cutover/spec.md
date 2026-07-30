## MODIFIED Requirements

### Requirement: Mutation admission SHALL follow critical smoke

Before enabling native mutations, the coordinator SHALL execute one versioned,
ordered, non-destructive critical-smoke roster for the receipted production
owner. The roster MUST validate current health and handshake identity, storage,
Workbench chrome, bounded Topic list, Topic detail or its typed empty branch,
canonical manifest/status, reference/cache status, a bounded graph read, and
one bounded worker operation. Every check SHALL produce structured
identity-bound evidence, and no required category may be inferred from
capability advertisement alone.

#### Scenario: Critical smoke succeeds
- **WHEN** every required critical read, empty-state branch where applicable, and worker responsiveness check succeeds for the current receipted owner
- **THEN** the coordinator submits the complete roster digest for activation
- **AND** the service may enable mutation admission only after validating that evidence

#### Scenario: Critical smoke fails or is incomplete
- **WHEN** any required check fails, times out, returns stale identity, is omitted, or cannot produce its typed empty-state evidence
- **THEN** the coordinator does not request mutation admission
- **AND** it stops the native owner and enters pre-mutation recovery

#### Scenario: Worker check exceeds its bound
- **WHEN** the non-destructive worker operation hangs, crashes, exceeds its deadline, or returns an invalid result
- **THEN** critical smoke fails without retrying through a plugin or Node implementation

## ADDED Requirements

### Requirement: A wholly absent source SHALL bootstrap natively

The coordinator SHALL classify the production database and canonical root as
one source. When both are absent it SHALL use the verified Rust executable to
create an empty basis and SHALL record `sourceOwner=empty-profile` before
running normal preflight, owner acquisition, smoke, and activation.

#### Scenario: New profile has no Synthesis source
- **WHEN** neither the database family nor canonical root exists
- **THEN** Rust creates and verifies an empty basis without invoking a plugin or Node repository
- **AND** the admitted owner passes the same smoke and receipt gates as an upgraded profile

#### Scenario: Source is partially present
- **WHEN** only one production root or an orphan database sidecar file exists
- **THEN** cutover fails with `synthesis_source_state_incomplete`
- **AND** no source file is created, removed, or overwritten

### Requirement: Cutover drain SHALL be non-terminal

Cutover SHALL invalidate and await the current default-client generation
without entering terminal add-on shutdown.

#### Scenario: Cutover completes or fails before admission
- **WHEN** a later caller acquires the default client
- **THEN** acquisition observes the current native readiness state
- **AND** it does not fail solely because an earlier cutover drain permanently closed the lifecycle

### Requirement: Admitted restart SHALL refresh only volatile owner evidence

When a matching `mutation_enabled` receipt already exists, startup SHALL
acquire a new native service instance, rerun critical smoke and activation, and
refresh the receipt service identity without repeating backup or preflight.

#### Scenario: Matching admitted profile restarts
- **WHEN** profile, receipt, durable basis, bundle fingerprint, and capability fingerprint still match
- **THEN** owner, activation, and receipt identify the new service instance
- **AND** the receipt remains in `mutation_enabled` with the same durable basis

#### Scenario: Admitted durable identity changed
- **WHEN** an admitted refresh changes any field other than service instance and monotonic update time
- **THEN** the receipt store rejects the transition
- **AND** startup enters Rust-only repair instead of replacing durable cutover evidence
