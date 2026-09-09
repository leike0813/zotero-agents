## Why

Runtime persistence policy was split across a filesystem module, a separate integrity module, and callback registrations owned by individual stores. This made cleanup behavior depend on import-time registration and left callers to compose related scans themselves.

## What Changes

- Consolidate usage scanning, integrity scanning, category cleanup, issue cleanup, and retention cleanup behind one Runtime Persistence Governance module.
- Keep runtime root/path resolution, managed-path policy, and late-bound filesystem adapter selection in the runtime persistence module.
- Replace store-owned governance registrations with direct use of existing store cleanup/read capabilities.
- Remove the separate integrity module and the unused scan event hook.
- Document Runtime Persistence Governance as a project domain term and update its component ownership documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-persistence-governance`: Require a consolidated governance interface while preserving runtime persistence as the filesystem/path owner.

## Impact

The change affects runtime persistence, plugin state, runtime logs, ACP skill-run persistence, preferences cleanup, Host Bridge diagnostics, the cleanup CLI, related tests, and architecture documentation. It introduces no dependency, wire-format, or user-authored data changes.
