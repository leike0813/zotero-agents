## MODIFIED Requirements

### Requirement: Production activation SHALL require an exact proven inventory

The activation coordinator SHALL require the seven language-neutral production
surface corpora to partition the closed 95-operation manifest exactly once.
Every operation MUST have public differential evidence, matching request/result
metadata, one TypeScript capability entry, one Rust dispatcher handler, and a
matching TypeScript/Rust ready-roster entry. Verification MUST consume stable
current-state contract and source paths and MUST NOT depend on active or
archived OpenSpec change directories, task files, dates, or change names.

#### Scenario: Any operation is missing, duplicated, unknown, or unproven
- **WHEN** corpus ownership, operation metadata, dispatcher, TypeScript roster, Rust roster, ready roster, or evidence comparison is not an exact match
- **THEN** activation fails closed
- **AND** no default production client or mutation admission is published

#### Scenario: Planning change is archived
- **WHEN** every R9a planning change has moved out of the active change directory
- **THEN** the exact production inventory and evidence gate still passes from current-state contracts and source
- **AND** no archived task checkbox is read as runtime evidence

### Requirement: Final verification SHALL be release-quality and fail closed

R9a completion SHALL require strict validation of its current specs, exact
contract/capability/corpus ownership checks, production boundary checks,
complete critical-smoke evidence, full operation parity, relevant Core and
Stage-1 integration tests, TypeScript checks, Rust format/clippy/workspace
tests, and the production build. Every required command MUST remain runnable
after the implementing changes are archived.

#### Scenario: Any required gate fails
- **WHEN** one required verification command or evidence set is incomplete, archival-dependent, or failing
- **THEN** R9a remains incomplete
- **AND** destructive R9b retirement is not authorized

## ADDED Requirements

### Requirement: Production activation SHALL bind a complete smoke roster

Activation evidence SHALL identify a versioned ordered critical-smoke roster
and SHALL bind every roster result to the current profile, receipt, service
instance, capability fingerprint, and production owner. The aggregate digest
MUST cover the roster version, ordered check IDs, and normalized per-check
digests; a boolean, partial response list, log message, or caller-selected
subset MUST NOT satisfy activation.

#### Scenario: Complete current smoke is presented
- **WHEN** every required check ran once for the current receipted owner and the aggregate digest matches
- **THEN** Rust may persist activation and open its in-memory mutation gate

#### Scenario: Smoke evidence is partial, stale, duplicated, or replayed
- **WHEN** a check ID is absent or duplicated, the roster version is unknown, or any bound identity differs
- **THEN** activation fails closed before mutation admission
- **AND** the plugin does not complete the `mutation_enabled` receipt

