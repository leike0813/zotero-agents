## Context

This change owns the twelve Citation Graph operations listed in the parent operation-ownership matrix. They combine graph reads, deterministic layout/metrics computation, paged library inputs, durable caches, and asynchronous rebuild/update jobs.

## Goals / Non-Goals

**Goals:**

- Preserve Citation Graph query, slice, cluster, metrics, layout, rank, cache, retry, and update semantics.
- Execute compute in native workers and keep Zotero reads behind bounded reverse-Host ports.
- Persist observable cache/job state and prove restart-safe behavior.

**Non-Goals:**

- Reference matching or canonical review behavior.
- Direct Rust access to Zotero objects or credentials.
- Production activation or global mutation admission.

## Decisions

### Separate Host input collection from native compute

The application requests bounded pages through typed reverse-Host ports, normalizes an immutable worker input, and executes it in the native worker pool. Public no-argument refresh methods create jobs; they do not expose internal worker request hashes or full library payloads.

### Make cache and job transitions durable

Layout, metrics, graph cache, retry, supersession, and terminal job state use existing repository/checkpoint owners. Cache publication occurs only after the computed basis and durable receipt agree.

### Gate each capability with public evidence

Differential fixtures cover deterministic ordering, pagination, empty graphs, stale basis, worker failure, Host disconnection, retry, restart, payload limits, and deadlines. Only passing capabilities enter the ready roster.

## Risks / Trade-offs

- [Paged Host state changes during collection] → Bind every page to one source revision or fail as superseded.
- [Long compute crosses the caller deadline] → Propagate cancellation into worker execution and check the deadline before publication.
- [Retry duplicates cache writes] → Use durable job/idempotency identity and atomic cache replacement.
