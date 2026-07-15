## Why

Production MCP already lists and dispatches tools through the Host Bridge capability catalog, but the unreachable legacy MCP tool registry still imports the complete Synthesis service. Host Bridge also resolves that service directly for twenty-three normal capabilities and eight debug capabilities. These two proxy layers are the final production consumers outside the client composition seam.

## What Changes

- Remove the unused MCP tool registry and its private dependency closure so the Host Bridge capability catalog is the only live MCP tool source.
- Add environment-neutral, domain-grouped Synthesis client contracts for the Host Bridge query, repair, export, and debug surface.
- Route all Host Bridge Synthesis capabilities through the cached default client while retaining connection-mode delivery, approval, schemas, aliases, and result envelopes.
- Replace service-based Host Bridge and MCP test injection with client injection and remove the obsolete MCP service facade type.
- Update the service inventory to retain 128 public methods while reducing production direct consumers from three to one.

## Capabilities

### New Capabilities

- `synthesis-host-bridge-client-consumer`: Defines grouped client contracts, in-process adaptation, delivery context, debug routing, and the Host Bridge client boundary.
- `zotero-mcp-host-bridge-capability-catalog`: Defines the Host Bridge catalog as the only MCP tool list and dispatch source and forbids a legacy MCP service path.

### Modified Capabilities

None.

## Impact

The change affects Synthesis contracts, in-process composition, Host Bridge capability routing, MCP protocol cleanup, boundary inventory, focused tests, and current-state documentation. It does not change capability names, CLI mappings, approval rules, persistence, domain behavior, download bundles, the 128-method public service surface, or process ownership.
