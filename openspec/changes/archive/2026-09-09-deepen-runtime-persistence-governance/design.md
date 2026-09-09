## Context

See [proposal.md](./proposal.md) for motivation. Runtime persistence previously combined filesystem/path adaptation with usage and retention policy, while integrity scanning lived in a second module and individual stores registered cleanup behavior through module-level callbacks. Preferences, Host Bridge diagnostics, lifecycle cleanup, and the CLI all depended on that distributed ownership.

The plugin must keep filesystem selection late-bound for Zotero and Node runtimes. Cleanup must remain limited to plugin-managed runtime data and must not include durable knowledge or user-authored content.

## Goals / Non-Goals

**Goals:**

- Give runtime-data observation and cleanup one semantic owner.
- Keep filesystem/path mechanics separate and reusable across runtimes.
- Remove registration-order coupling while preserving existing cleanup behavior and DTOs.

**Non-Goals:**

- Change persistence locations, SQLite schemas, wire contracts, or retention periods.
- Add a registry, provider interface, or new dependency.
- Make runtime state databases generic cleanable categories.

## Decisions

### One governance module owns policy operations

`runtimePersistenceGovernance.ts` owns the combined scan, category cleanup, integrity-issue cleanup, and retention entry points. Callers import those named operations directly.

Alternative considered: keep usage, integrity, and cleanup in separate modules. That preserves smaller files but leaves callers responsible for composing one policy domain and keeps ownership ambiguous.

### Runtime persistence remains the filesystem boundary

`runtimePersistence.ts` retains runtime-root resolution, semantic paths, managed-path validation, traversal, file operations, and late-bound adapter selection. Governance determines what is eligible and delegates physical work to that module.

Alternative considered: move filesystem operations into governance. That would make the policy module broad and weaken the existing cross-runtime adapter seam.

### Existing stores expose concrete cleanup capabilities

Governance directly calls the existing plugin-state, runtime-log, ACP skill-run, and workflow-product capabilities. Import-time registration callbacks are removed.

Alternative considered: retain or generalize the callback registry. There is one product composition and a fixed category set, so a registry adds indirection without a runtime extension requirement.

### Preserve externally consumed shapes

Existing usage, integrity, cleanup, and progress DTOs remain stable. The category union is narrowed to categories that can actually be cleaned; state databases remain diagnostic-only fields.

## Risks / Trade-offs

- [The governance module has direct knowledge of existing stores] → Keep the dependency one-way: stores expose narrow operations and do not import governance.
- [Moving code can accidentally change cleanup eligibility] → Reuse the existing behavior tests and add one regression at the category trust boundary.
- [Node-only APIs could leak into the plugin runtime] → Continue routing all filesystem work through the late-bound runtime persistence adapter.

## Migration Plan

1. Add the governance module and route tests through its public operations.
2. Move scan and cleanup policy into governance without changing persisted formats.
3. Update preferences, Host Bridge, lifecycle, and CLI callers.
4. Remove obsolete registrations, the separate integrity module, and the unused hook event.
5. Update the capability spec and architecture documentation, then run targeted tests, type checking, lint, and formatting checks.

Rollback is a source-level revert; no persisted-data migration is required.
