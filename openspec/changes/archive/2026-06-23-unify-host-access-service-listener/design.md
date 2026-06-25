## Context

Host Bridge and embedded Zotero MCP previously owned separate HTTP sockets and
port ranges even though both depended on the same Zotero-side host access
authority, bearer token, and capability registry. Host Bridge was the
supervised service with LAN, fixed-port, and profile behavior, while MCP had its
own localhost listener and descriptor state. That split made port/profile state
drift possible and forced prefs to explain two service lifecycles.

The preferences Host Access card also used the Host Bridge status text for both
service diagnostics and operation feedback. Button responses such as CLI
installation, endpoint display, token rotation, and profile copy could look like
service errors.

## Approach

Use Host Bridge supervision as the single Host Access listener lifecycle. The
listener keeps the existing `/bridge/v1/*` REST surface and dispatches `/mcp` to
the Zotero MCP JSON-RPC handler. MCP public exports remain available, but they
manage route availability and descriptor/status metadata instead of creating or
closing an independent `nsIServerSocket`.

Host Bridge fixed-port, LAN binding, and advertised-host preferences become the
only Host Access network controls. Loopback mode advertises
`http://127.0.0.1:<port>/mcp`; LAN mode advertises the same remote host/port
policy as Host Bridge remote endpoint with path `/mcp`. The well-known profile
keeps its existing `/bridge/v1` endpoint contract for CLI compatibility, with
MCP exposed only as additive metadata.

MCP authentication continues to use the Host Bridge bearer token. Host Bridge
status, health, and manifest may expose additive route metadata, but existing
fields retain their meanings. MCP status derives endpoint, port, and listener
availability from Host Bridge while keeping MCP-specific queue, guard, and
recent request diagnostics.

The prefs card keeps service status summaries in `host-bridge-status` and
`mcp-server-status`. Operation results render into a separate Host Access notice
area, with message, path, and token scrubbing before display.

## Edge Cases

- If LAN mode is enabled, MCP is intentionally exposed on the same LAN listener
  and uses the same advertised host as Host Bridge.
- If the fixed LAN port cannot bind, Host Access remains in the existing Host
  Bridge error/recovery path and MCP descriptor generation fails with that
  listener state.
- If MCP is disabled, `/bridge/v1/*` may continue to run; MCP descriptor
  resolution fails and direct `/mcp` route handling returns an unavailable
  response.
- If Host Bridge restarts or changes port, MCP descriptor/status refresh from
  the current Host Bridge status instead of retaining stale endpoint metadata.
- Operation failures in prefs do not become service errors unless the returned
  server snapshot itself reports a listener/service error.

## Alternatives Considered

- Keeping separate sockets and only improving status display was rejected
  because it would preserve the port/profile drift class of bugs.
- Creating a separate `mcpLanEnabled` or MCP port setting was rejected because
  the intended Host Access model has one network exposure policy.
- Moving MCP under `/bridge/v1/mcp` was rejected to keep MCP descriptor paths
  conventional and avoid changing the JSON-RPC endpoint contract.
- Rewriting Host Bridge and MCP into one protocol was rejected because CLI REST
  and MCP JSON-RPC clients have different wire contracts.
