# synthesis-native-production-activation Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-production-activation. Update Purpose after archive.
## Requirements
### Requirement: Production activation SHALL require an exact proven inventory

The activation coordinator SHALL require all seven R9a operation-surface changes to be complete. The operation-ownership matrix MUST partition the closed 95-operation manifest exactly once, and every operation MUST have passing public differential evidence and a matching ready-roster entry.

#### Scenario: Any operation is missing, duplicated, or unproven
- **WHEN** ownership, dispatcher, TypeScript, Rust, ready-roster, or evidence comparison is not an exact match
- **THEN** activation fails closed
- **AND** no default production client or mutation admission is published

### Requirement: Activation and mutation admission SHALL be crash-safe

The lifecycle-scoped `system.production.activate` operation SHALL bind current receipt, instance, capability fingerprint, complete roster, and smoke digest. Rust MUST persist and fsync activation and owner identity before opening its mutation gate; the plugin MUST persist final `mutation_enabled` only after mutation health succeeds.

#### Scenario: Activation completes normally
- **WHEN** ownership, identity, complete roster, smoke evidence, and mutation health all match
- **THEN** Rust admits mutations and the plugin completes the matching durable receipt

#### Scenario: Crash occurs before the final mutation receipt
- **WHEN** native activation is durable but `mutation_enabled` is absent
- **THEN** restart enters Rust-only repair
- **AND** no request is routed to the legacy implementation

### Requirement: All production consumers SHALL share one native composition

Default-client, Workflow, Workbench, Host Bridge, MCP, startup reconciliation, invalidation, and shutdown SHALL use the same generation-scoped native production composition. Production consumers MUST NOT import, construct, or fall back to the legacy service/composition.

#### Scenario: Native service is unavailable during startup or repair
- **WHEN** a production consumer requests Synthesis before verified readiness
- **THEN** it receives the stable maintenance, unavailable, incompatible, or repair-required result
- **AND** legacy factory invocation remains zero

#### Scenario: Plugin shutdown begins
- **WHEN** the owner is active
- **THEN** shutdown invalidates the native client, closes reverse Host, and stops the supervisor in ownership-safe order

### Requirement: Final verification SHALL be release-quality and fail closed

R9a completion SHALL require strict OpenSpec validation, exact contract/capability/ownership checks, boundary checks, full operation parity, relevant Core and Stage-1 integration tests, TypeScript checks, Rust format/clippy/workspace tests, and the production build.

#### Scenario: Any required gate fails
- **WHEN** one required verification command or evidence set is incomplete or failing
- **THEN** R9a remains incomplete and mutation/default-client activation remains closed

### Requirement: Runtime activation SHALL bind the admission generation

Production admission, critical-smoke evidence, Rust activation evidence,
discovery, health, and handshake SHALL identify the same runtime-admission
generation in addition to the existing receipt, profile, service, capability,
and roster identity.

#### Scenario: Pending generation activation matches
- **WHEN** every identity and smoke field matches the pending admission generation
- **THEN** Rust persists generation-bound activation before opening mutation admission

#### Scenario: Generation is missing or stale
- **WHEN** the production admission or any activation evidence omits the generation or reports another generation
- **THEN** activation and plugin promotion fail closed

### Requirement: Promotion SHALL precede startup reconcile

The plugin SHALL atomically promote matching durable Rust activation to current
runtime admission before executing startup reconcile or publishing ready.

#### Scenario: Reconcile fails after promotion
- **WHEN** the new generation is current and startup reconcile returns an error
- **THEN** the failure is post-activation repair
- **AND** the plugin does not restore the pre-upgrade backup or previous runtime

