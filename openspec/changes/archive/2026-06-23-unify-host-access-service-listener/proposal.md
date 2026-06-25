## Why

Host Bridge and Zotero MCP currently run as separate embedded HTTP sockets even
though they share the same host access authority, bearer token, and Zotero-side
capability surface. This creates split lifecycle state, split ports, and confusing
preferences output.

## What Changes

- Merge Host Bridge and Zotero MCP onto one Host Access listener and one port.
- Keep Host Bridge REST at `/bridge/v1/*` and MCP JSON-RPC at `/mcp`.
- Make MCP follow the existing Host Bridge fixed-port and LAN settings.
- Move preferences operation feedback into a dedicated Host Access notice area
  instead of mixing it into service status text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-service`: Host Bridge owns the unified Host Access listener and
  routes `/bridge/v1/*`.
- `acp-embedded-zotero-mcp-server`: MCP is served from the unified Host Access
  listener at `/mcp`.
- `host-bridge-lifecycle-and-status`: Host Bridge supervision becomes the single
  socket lifecycle source for Host Access.
- `host-access-preferences-ui`: preferences display separates service status
  from operation feedback.

## Impact

- Affects Host Bridge server lifecycle, embedded MCP descriptor/status, ACP MCP
  injection, and Host Access preferences UI.
- Updates focused Host Bridge, MCP, and preferences tests.
- No CLI endpoint contract change; `/bridge/v1` remains the profile endpoint.
