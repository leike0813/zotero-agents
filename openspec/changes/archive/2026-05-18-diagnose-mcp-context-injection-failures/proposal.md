# Backend-Agnostic MCP Context Injection Diagnostics

## Why

Recent topic synthesis runs show host Zotero MCP preflight succeeding while ACP
callable smoke fails because required `mcp__zotero__...` tools never become
callable in the backend session. The current failure only reports missing tools,
which hides whether the break happened at descriptor injection, backend tool
discovery, tool-call transport, or model behavior.

Although the observed failures are concentrated in Claude Code ACP, the failure
class is backend-agnostic: any ACP backend can accept a descriptor yet fail to
surface those tools to the model runtime.

## What Changes

- Add a backend-agnostic MCP context injection diagnostic model.
- Collect common evidence from ACP adapter diagnostics, persisted skill-run
  events, transcript items, and Zotero MCP runtime logs.
- Add provider-specific evidence collection for Claude Code ACP debug/session
  files without making those files a core dependency.
- Classify MCP smoke failures into stable backend-neutral categories.
- Write redacted per-run diagnostics under the ACP skill run workspace.
- Expand Zotero MCP transport diagnostics for request/response byte and header
  facts needed to debug backend discovery failures.

## Non-Goals

- Do not bypass callable smoke.
- Do not add automatic session retry or transport fallback.
- Do not change MCP tool names, synthesis workflow behavior, or skill-stage
  semantics.
- Do not treat Claude Code ACP debug logs as required for all backends.
