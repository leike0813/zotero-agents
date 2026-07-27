## Context

The parent R9a change already established fail-closed owner, backup, receipt, reverse-Host, native composition, and static-boundary foundations. Seven child surface changes now own all ninety-five public operations. This change is the only place that may combine those results into production readiness, mutation admission, and default-client publication.

## Goals / Non-Goals

**Goals:**

- Prove the operation-ownership matrix is an exact partition of the closed 95-operation inventory and every operation has passing evidence.
- Atomically activate the Rust production owner and mutation gate under lifecycle-scoped authority.
- Publish one generation-scoped native client to all production consumers with no legacy fallback.
- Run final cross-language, crash, integration, static-boundary, compiler, Rust, and production-build gates.

**Non-Goals:**

- Implementing or repairing individual domain operation semantics.
- Deleting legacy/Node source or performing R9b.
- Release dispatch, remote R8 acceptance, Gitee synchronization, or commits.

## Decisions

### Treat the seven surface changes as hard prerequisites

Activation cannot begin while any owned operation lacks its public differential evidence or ready-roster entry. The final gate compares the machine-readable ownership matrix, operation manifest, Rust dispatcher, TypeScript capabilities, and service ready roster for exact equality and uniqueness.

### Use one lifecycle-token activation command

`system.production.activate` binds the lifecycle token, receipt, service instance, capability fingerprint, complete ready roster, and critical-smoke digest. Rust persists `native-activation.json`, updates and fsyncs the production-owner marker, and only then opens the in-memory mutation gate and refreshes discovery/health/handshake.

### Complete admission from the plugin after mutation health

The plugin writes the final `mutation_enabled` receipt only after a post-activation mutation-health check. If Rust activation is durable but the final receipt is absent, restart enters Rust-only repair; it never returns to the legacy owner automatically.

### Keep startup and shutdown ownership explicit

Startup launches cutover in the background and returns bounded maintenance/unavailable results until readiness. Builtin Tag initialization and runtime reconcile wait for owner readiness. Shutdown invalidates the default native client, closes reverse Host, and then stops the production supervisor.

## Risks / Trade-offs

- [A false-ready operation enables unsafe mutation] → Require exact per-operation evidence and keep activation separate from handler registration.
- [Crash splits Rust activation and plugin receipt] → Detect the partial phase durably and enter Rust-only repair.
- [A consumer constructs legacy directly] → Enforce static import/constructor guards plus Workflow, Workbench, Host Bridge, and MCP integration tests.
- [Final verification is expensive] → Keep focused evidence in child changes; reserve the full gate for this activation change.
