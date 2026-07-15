## Context

The client foundation migrated workflow Topic options but the migration inventory still contains ten direct legacy consumers. Hooks use startup reconcile, protected reset, and cache invalidation; Host Bridge uses invalidation; the item observer uses one echo-classification method but receives the full service type.

## Goals / Non-Goals

**Goals:**

- Add narrow grouped client capabilities for lifecycle, maintenance, and notifier input.
- Replace three direct legacy consumers with the existing default client composition.
- Return a bounded boolean notification receipt instead of a repository effect row.
- Preserve startup failure isolation, reset confirmation behavior, and synchronous invalidation semantics.

**Non-Goals:**

- Migrate Workbench, Host Bridge capability handlers, MCP, workflow host, or harness methods.
- Add remote transport or change storage ownership.
- Expose repository effect records in contracts.

## Decisions

### 1. Notifier echo returns a bounded receipt

The client contract returns `{ consumed: boolean }`; the in-process adapter converts the legacy row-or-null result. The plugin observer only needs classification, so exporting the row would leak persistence structure.

### 2. Default invalidation remains synchronous

`invalidateDefaultSynthesisClient` clears the cached client immediately and calls a captured legacy invalidator only if the legacy module has already loaded. This preserves synchronous preference handlers without eagerly importing the service.

### 3. Startup reconcile is explicitly asynchronous at the consumer seam

Hooks resolve the default client and invoke the grouped system capability in a fire-and-report promise chain. Failures remain non-blocking and are logged by the existing startup path.

### 4. Maintenance reset is a grouped command

The protected reset request and result become JSON-safe contract DTOs. Confirmation remains enforced by the in-process service; no automatic retry is introduced.

## Risks / Trade-offs

- **Dynamic client resolution changes startup scheduling by a microtask/import boundary** → Reconcile is already non-blocking best-effort work and tests lock failure isolation rather than synchronous timing.
- **Invalidation before first client use cannot call the legacy invalidator** → No default service has been loaded through this composition in that case; clearing the client is sufficient.
- **Other modules may load the legacy service independently** → They remain on the audited migration allowlist and are removed in later changes.

## Migration Plan

Add red adapter/dependency tests, extend contracts and adapter, migrate consumers, update the inventory, and run targeted/invariant/build gates. Rollback restores the three imports; no data migration occurs.

## Open Questions

None.
