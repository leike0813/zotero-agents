## Why

Remote Topic Context and filtered paper-artifact export still make the Synthesis application service own Host Bridge download registration, temporary export roots, ZIP creation, and runtime byte I/O. This is an active Host/runtime dependency that prevents the service from becoming an environment-neutral sidecar application boundary.

## What Changes

- Add a strict bounded `SynthesisHostExportDeliveryPort` for publishing text-entry ZIP archives through an opaque Host download descriptor.
- Move temporary export storage, ZIP creation, hashing, Host Bridge file registration, and failure cleanup into a Host adapter.
- Keep local Topic Context and ACP run-root writes unchanged, while making remote exports build their entries in memory without service-owned temporary files.
- Preserve the existing `bridge-download` response shape, client methods, Host Bridge/MCP behavior, and service inventory.

## Capabilities

### New Capabilities

- `synthesis-host-export-delivery-port`: Defines strict archive request/result DTOs, shared limits, Host adapter behavior, composition, and stable failure semantics.

### Modified Capabilities

- `synthesis-mcp-tools`: Keeps remote Topic Context and filtered paper-artifact downloads behaviorally compatible while routing their delivery through the Host port.

## Impact

- Affects synthesis contracts, remote export helpers, the legacy composition root, focused Core tests, and current-state Synthesis documentation.
- Keeps the complete service surface at `125 methods / 1 direct consumer` and changes no UI, CLI, database, public client method, or download protocol.
- Adds no dependency and does not change local output-path or ACP run-root delivery.
