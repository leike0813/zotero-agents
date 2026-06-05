## 1. MCP Server And Auth

- [x] 1.1 Reuse Host Bridge bearer-token validation for MCP requests.
- [x] 1.2 Build MCP descriptors with the Host Bridge token.
- [x] 1.3 Respect `mcpServer.enabled` in MCP startup.

## 2. MCP Capability Mirror

- [x] 2.1 Generate MCP tool list from Host Bridge capabilities.
- [x] 2.2 Dispatch MCP tool calls through Host Bridge capability handlers.
- [x] 2.3 Preserve Zotero-side approval for write-capable MCP calls.

## 3. Preferences And Lifecycle

- [x] 3.1 Add default MCP enabled preference.
- [x] 3.2 Add preferences UI and locale entries.
- [x] 3.3 Start or stop MCP from plugin lifecycle and preference changes.

## 4. Third-Party Agent Assets And Docs

- [x] 4.1 Add wrapper skill under `assets/wrapper-skills/zotero-bridge-cli`.
- [x] 4.2 Update Host Bridge CLI documentation for the new MCP role.
- [x] 4.3 Add a doc-sync check and npm script.

## 5. Verification

- [x] 5.1 Run TypeScript typecheck.
- [x] 5.2 Run focused MCP/Host Bridge tests.
- [x] 5.3 Run doc-sync check.
