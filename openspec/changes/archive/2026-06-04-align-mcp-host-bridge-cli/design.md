## Design

MCP remains an embedded localhost HTTP JSON-RPC server, but its tools are
generated from Host Bridge capabilities at runtime. `tools/list` exposes the
capability name, summary, and a generic JSON schema derived from the capability
input kind. `tools/call` resolves the capability by name and invokes its
registry handler.

Bearer authentication is shared with Host Bridge by reusing
`isHostBridgeAuthorizationValid()` and `getHostBridgeToken()`. This also lets
the Host Bridge master token authorize MCP requests.

MCP is controlled by `extensions.zotero.zotero-skills.mcpServer.enabled`,
defaulting to `true`. Plugin startup starts MCP when enabled; disabling the
preference shuts it down. Explicit MCP descriptor injection still respects the
preference.

Write-capable MCP calls preserve approval behavior by checking capability
approval metadata. For `mutation.execute`, MCP previews the mutation and routes
the approval request through the existing MCP permission callback before
executing the registry handler.

Documentation consistency uses a lightweight static check. It parses capability
names from the registry and verifies that CLI documentation, injected README,
wrapper skill, CLI source, and MCP wiring contain the required mappings.

