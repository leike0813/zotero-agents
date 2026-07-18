## Context

WS5 has established an identity-bound SQLite repository, Topic canonical store, seven domain applications, Knowledge Checkpoint, Durable Bundle, and WebDAV owners in private Node composition. Production debugging and maintenance still combine DTO canonicalization, repository inspection, Host reads, filesystem ownership, and operation delegation in plugin modules. Copying that implementation into Node would create a second mutation owner and expose environment-specific details; omitting it would leave WS5 without an operability or closure proof.

## Goals / Non-Goals

**Goals:**

- Define one strict, bounded, JSON-safe debug contract and repository projection shared by private and production compositions.
- Return coherent isolated snapshots or `superseded`, never a repository/canonical mixture.
- Reuse the current checkpoint, durable, and protected-reset owners for maintenance actions.
- Preserve production Host Bridge, CLI, MCP, DTO, method, and capability behavior.
- Make all six WS5 exit gates executable and set WS6 shadow parity as the next stage.

**Non-Goals:**

- Public sidecar routes, worker operations, production ownership transfer, arbitrary SQL/path/file access, raw rows, unbounded snapshots, unrestricted repair/reset, legacy import migration, shadow parity, cutover, or release publication.

## Decisions

### 1. Contracts define projections, not storage escape hatches

Shared contracts expose status, schema summary, cache and operation pages, isolated snapshot, paper/Topic inspection, snapshot diff, and profiler results. Ordinary pages cap at 100 and debug pages at 1,000. Every builder owns stable ordering, cursor, truncation, diagnostics, redaction, and JSON safety. SQL, table names, arbitrary paths, raw rows, executable values, and a full unbounded snapshot are not representable. A generic query surface was rejected because it would turn debug code into an alternate repository API.

### 2. The repository owns a read-only projection

The repository projection performs bounded reads and basis capture inside a SQLite transaction. The application then reads bounded canonical Topic descriptors outside that transaction and recaptures repository basis. If either basis differs, the application returns `superseded` without payload. Holding a database transaction across filesystem inspection was rejected because it would couple SQLite locks to long IO; accepting the first basis was rejected because it could produce mixed evidence.

### 3. Read APIs are side-effect free and diff is pure

Every inspect operation is a pure projection over current facts and never repairs, rebuilds cache, creates operations, mutates a domain, or writes diagnostics. Snapshot diff consumes two rebuilt bounded DTOs and returns deterministic additions, removals, and changes. Maintenance commands remain separate explicit application ports.

### 4. Maintenance delegates to existing owners

Schema inspection delegates to the repository projection. Checkpoint export/verify delegates to Knowledge Checkpoint; durable preview/apply/export delegates to Durable Bundle; isolated reset delegates to the existing confirmation-protected repository reset. Legacy JSON import, production profiler sources, Host-backed paper detail, and clean-install reset remain production-owned and are classified in the migration inventory. A parallel maintenance implementation was rejected because receipts, CAS, confirmation, and recovery rules must have one owner.

### 5. Profiler is an optional redacted port

The application accepts a strict optional profiler port whose output is rebuilt and redacted through the shared contract. Node composition omits it and deterministically returns `unavailable`. Production may adapt its existing source without exposing executable stacks, paths, or raw values.

### 6. Lifecycle is single-active and dependency ordered

The debug/maintenance application admits one active operation, supports admission stop, and drains active work during shutdown. Node composition creates it after repository/canonical recovery and all domain/checkpoint/durable/WebDAV applications. Shutdown stops and drains debug first, then WebDAV, durable, checkpoint, domain applications, canonical, and repository. No route, `SynthesisClient`, Workbench, Host Bridge, or MCP capability references the private owner.

### 7. WS5 closure is inventory-driven

The Stage 1 plan and machine-readable migration inventory remain the SSOT. Tests prove isolated private use cases, service-package import boundaries, no Host/file/network IO inside transactions, no repository/canonical commit in compute workers, explicit disposition for every production capability, runtime/XPI inclusion, and unchanged `108 methods / 1 direct consumer`. Documentation changes occur only after those gates pass.

## Risks / Trade-offs

- [Canonical files change repeatedly during inspection] → Return bounded `superseded` immediately; callers retry explicitly.
- [Shared DTOs accidentally expand production debug output] → Compatibility adapters retain established method/result shapes and Core fixtures lock the public surfaces.
- [Debug inspection becomes a hidden mutation path] → Separate read and maintenance ports and assert zero repository/canonical writes for every read.
- [Optional profiling leaks sensitive runtime data] → Rebuild a fixed redacted projection and default Node to `unavailable`.
- [WS5 closure claims outrun implementation] → Gate documentation updates on executable Core, boundary, packaging, and inventory assertions.

## Migration Plan

1. Add Core 217 tests and shared contracts/repository projections.
2. Implement the application and compose the private Node owner with lifecycle ordering.
3. Delegate production canonicalization, schema projection, bounds, and pure diff through shared SSOT while retaining compatibility exports.
4. Update inventories and current-state documents only after all six exit gates pass.
5. Rollback removes private composition and shared delegation; no production data or format migration is involved.

## Open Questions

None. Production routing and shadow parity remain WS6/WS7 work.
