# Proposal

## Why

The Built-in Pi Agent Runtime has a Tool Gateway and a host process bridge but cannot use outbound MCP tools. C10 adds reviewed, profile-scoped MCP sources before the Conversation and Brokered Web slices consume them.

## What Changes

- Add explicit Streamable HTTP and stdio MCP sources, lazy discovery, turn-frozen selected tools, and a fixed `mcp` proxy with optional promoted tools.
- Store source credentials in the existing Built-in Agent Credential Store and manage sources in the existing Built-in Agent page.
- Route effects, permission, execution evidence, and result limits through the Tool Gateway. Add `external-mutation` to its effect vocabulary.
- Replace the monolithic MCP v1 test dependency with the pinned official v2 client/core packages and prove the Zotero browser build boundary.

## Capabilities

### New Capabilities

- `pi-mcp-tool-sources`: Profile configuration, discovery, frozen catalog, outbound calls, transport trust, and result projection.

### Modified Capabilities

- `pi-tool-gateway-policy`: Hidden MCP catalog identity and external mutation classification enter frozen admission.
- `backend-manager-ui`: Built-in Agent page manages MCP sources and redacted source credentials.

## Impact

Pi credential and Gateway contracts, Backend Manager DTO/UI, plugin shutdown, MCP SDK dependency, Node/Zotero tests, domain and handoff docs. The inbound Zotero MCP server keeps its behavior.
