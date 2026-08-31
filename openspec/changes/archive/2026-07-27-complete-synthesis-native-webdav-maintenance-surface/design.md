## Context

This change owns nine high-risk operations: WebDAV sync/pause/resume/retry/conflict resolution, public maintenance description, startup reconcile, database reset, and clean-install reset. Their crash and authority rules differ from ordinary application mutations.

## Goals / Non-Goals

**Goals:**

- Persist WebDAV state, conflicts, retry schedule, object receipts, and restart behavior.
- Implement typed maintenance/reset/reconcile ports with exclusive owner and mutation-admission checks.
- Prove crash-window and Rust-only repair behavior before readiness.

**Non-Goals:**

- General artifact export or Tag effects.
- Passing WebDAV credentials to Rust or storing authoritative state only in memory.
- Publishing the default client.

## Decisions

### Persist WebDAV state before exposing transitions

Rust owns the durable sync state machine and secret-free remote object metadata. The reverse Host performs credentialed transport only. State transitions and remote receipts use atomic durable writes and idempotent operation identity.

### Isolate destructive maintenance

Reset and clean-install reset use dedicated maintenance ports, require current production-owner identity plus mutation admission, checkpoint/backup preconditions, and an exclusive operation lease. They cannot reuse a debug projection or silently return unsupported.

### Stop effects at the deadline boundary

Deadline and cancellation are propagated into WebDAV Host calls and maintenance stages. The runtime checks them before every durable or external effect and records the correct recoverable phase when interruption follows an earlier committed stage.

## Risks / Trade-offs

- [Remote mutation succeeds before local receipt fsync] → Reconcile by object/operation identity without blind replay.
- [Reset crashes between stores] → Use checkpointed phase receipts and enter Rust-only repair until coherence is restored.
- [Maintenance broadens dispatcher authority] → Keep production-root opening in `runtime_service` and socket transport in `runtime_reverse_host`.
