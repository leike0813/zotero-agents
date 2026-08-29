## Why

The Zotero host capability layer currently has two competing interface shapes: `WorkflowHostApi` is treated as the broker in some paths, while Host Bridge owns a second inferred broker shape and MCP can reconstruct that shape from partial workflow APIs. This duplicates ownership, hides runtime methods outside the public workflow contract, weakens JSON-safety guarantees, and has allowed a mutation result to expose a host-local attachment path.

This module is a core dependency for workflows, Host Bridge, and MCP. Its ownership, projection, error, and locality rules need to become explicit before further capabilities are added.

## What Changes

- Establish `ZoteroHostCapabilityBroker` as the canonical, stateless, in-process interface for context, navigation, library, metadata, and controlled mutation capabilities.
- Keep `WorkflowHostApi` v11 as the workflow compatibility interface and derive its broker-facing members through an explicit member projection; raw Zotero references remain confined to the workflow adapter.
- Require broker inputs, successful DTOs, and structured error details to be strict JSON values, while distinguishing JSON-safe process-local data from remote-safe Host Bridge data.
- Move navigation effects out of the context query family and keep authorization, interaction policy, exposure, and remote locality in downstream adapters.
- Make Host Bridge the only remote adapter and MCP the exact Host Bridge capability mirror.
- Remove the obsolete MCP `resolveHostApi` reconstruction path, unreachable legacy tool registry, downstream inferred broker type, and redundant broker error subclasses.
- Correct Host Bridge v2 attachment output so reads and mutation results never expose host-local paths and instead return opaque file descriptors or an unavailable state.
- **BREAKING (internal only):** rename the broker factory/resolver and remove internal compatibility aliases. The public Workflow Host API remains v11 and the Host Bridge protocol remains v2.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-capability-broker`: Make the canonical broker, workflow projection, domain ownership, and current Workflow Host API version explicit.
- `zotero-host-broker-capability-api`: Strengthen JSON DTO/ref/error guarantees and separate navigation from context queries.
- `acp-embedded-zotero-mcp-server`: Require MCP tools to execute only through the Host Bridge capability mirror.
- `host-bridge-output-boundaries`: Prohibit host-local attachment paths in capability and MCP results, including mutation results.

## Impact

- Core code: `src/modules/zoteroHostCapabilityBroker.ts`, `src/workflows/types.ts`, and `src/workflows/hostApi.ts`.
- Adapters: `src/modules/hostBridgeCapabilityRegistry.ts`, `src/modules/hostBridgeServer.ts`, and `src/modules/zoteroMcpProtocol.ts`.
- Executable contract: `host-bridge/contracts/capabilities.v2.json`; no Host Bridge major-version change and no release dispatch.
- Tests: broker, Host Bridge server, MCP protocol, and MCP mirror suites plus one fail-closed broker test harness.
- Documentation and governance: broker SSOT, capability registry documentation, domain vocabulary, project agent constraints, and Host Bridge semantic-surface validation.
