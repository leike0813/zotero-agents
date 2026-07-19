# synthesis-sidecar-isolated-repository-foundation Specification

## Purpose
Defines the runtime foundation for the Synthesis sidecar isolated-repository component, including its service wiring, dependency injection, and integration with the sidecar process lifecycle.

## Requirements

### Requirement: Isolated repository persists Citation Graph application projections

The shared repository and Node adapter SHALL install a separate graph-application schema identity, active state, nodes, edges, ownership, incoming groups, light/complex metrics, and layouts; full replacement SHALL compare-and-swap the active graph in one transaction and metrics/layout SHALL promote only for the active graph hash.

#### Scenario: Last-good graph survives failed replacement
- **WHEN** expected basis, row persistence, or transaction commit fails
- **THEN** the complete previous graph state and its readable projections remain unchanged

### Requirement: Shared repository foundation is the single source of truth

The system SHALL provide an environment-neutral repository package that owns strict SQL adapter primitives, foundation DTOs and rebuilders, schema identity, DDL, indexes, and CRUD for exactly `synt_schema_meta`, `synt_cache_basis`, and `synt_operation`. The plugin repository SHALL reuse these facts while retaining all production-only adapters, migrations, table families, and composition.

#### Scenario: Plugin and service use the same foundation contract
- **WHEN** repository boundary and parity checks inspect plugin and service implementations
- **THEN** both consume the shared foundation definitions and no copied foundation DTO or DDL exists

#### Scenario: Foundation package remains environment neutral
- **WHEN** static boundaries inspect the shared package
- **THEN** it imports neither Node, Zotero, Host, canonical-file, subprocess, nor plugin repository modules

### Requirement: Shadow repository is persistent and isolated

The sidecar SHALL open a real SQLite database only at `<profileRuntimeRoot>/shadow-repository/<dataRootId>/synthesis.db`, SHALL bind it to a strict identity marker, and SHALL create owner-only filesystem entries on POSIX. It MUST NOT accept or discover an arbitrary or production repository path.

#### Scenario: Repository survives service restart
- **WHEN** the service closes and restarts with the same profile and data-root identities
- **THEN** terminal operations and cache-basis rows remain available in the same isolated shadow repository

#### Scenario: Production repository remains inaccessible
- **WHEN** runtime configuration and service imports are inspected
- **THEN** the service has only opaque identities and no production database, canonical-file, Zotero, or Host access path

### Requirement: Repository initialization fails closed

The sidecar SHALL complete directory and identity validation, schema initialization, and startup reconciliation before publishing discovery or accepting HTTP requests. Identity mismatch, unsupported schema, or malformed state required for migration or reconciliation SHALL abort startup and close the database.

#### Scenario: Corrupt identity prevents readiness
- **WHEN** the persisted marker conflicts with the expected profile, data-root, schema, or repository identity
- **THEN** service startup fails and no discovery record or listening endpoint is published

#### Scenario: Schema initialization is idempotent
- **WHEN** the same valid repository is initialized repeatedly
- **THEN** it contains exactly the three foundation tables and their declared indexes without destructive reset

### Requirement: Foundation transactions are atomic

The Node SQLite adapter SHALL support parameterized run/get/all operations, atomic transactions, nested savepoints, rollback, strict rows, and deterministic close.

#### Scenario: Nested transaction rolls back locally
- **WHEN** an inner transaction fails inside a valid outer transaction
- **THEN** its writes are rolled back to the savepoint while the caller can complete or roll back the outer transaction deliberately

### Requirement: Restart reconciliation is conservative

At startup the repository SHALL transition only persisted `running` operations to `canceled`, preserve terminal operation history and cache-basis rows, and perform no engine or domain work.

#### Scenario: Restart cancels interrupted work
- **WHEN** a database contains running, succeeded, failed, and canceled operations before restart
- **THEN** only running operations become canceled and all other rows retain their terminal semantics

### Requirement: Repository observability is strict and constant-time

Authenticated health and handshake responses SHALL expose an identical O(1) snapshot containing only mode `isolated_shadow`, state `ready|stopping`, schema version `synthesis-repository-foundation.v1`, and an opaque repository ID.

#### Scenario: Snapshot does not leak storage details
- **WHEN** an authenticated client reads health and handshake
- **THEN** strict reconstruction succeeds, snapshots match, and no path, SQL, row, count, or production identifier is present

### Requirement: Repository shutdown is bounded

Every authenticated shutdown, host lease expiry, stdin EOF, signal, and supervisor stop path SHALL stop request acceptance before closing the repository and SHALL retain the existing 500 ms total shutdown budget.

#### Scenario: Database handle is released on shutdown
- **WHEN** any supported shutdown path completes
- **THEN** the repository snapshot reaches stopping, the SQLite handle is closed, and the database can be reopened without a stale service lock

### Requirement: Isolated repository persists narrow Topic application state

The environment-neutral repository and Node adapter SHALL persist strict Topic registry, Topic Graph, Concept, Topic Concept, interest metadata, and discovery projection records required by the Topic application, using indexed bounded reads and short transactions.

#### Scenario: Topic state survives restart
- **WHEN** Topic application records are committed and the same isolated repository identity is reopened
- **THEN** every strict record is available without production database access or canonical directory scanning
