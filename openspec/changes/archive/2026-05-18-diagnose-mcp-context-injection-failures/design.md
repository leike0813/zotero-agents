# Design

## Diagnostic Model

`mcp.context_injection_diagnostics@1.0.0` is written for failed callable smoke
runs. It records backend identity, session/workspace metadata, injected MCP
descriptor facts, backend MCP capabilities, host preflight result, smoke result,
observed evidence, classification, confidence, and next suggested probe.

Sensitive fields are redacted before persistence. Authorization values, bearer
tokens, and secret-looking keys never appear in diagnostic JSON or evidence logs.

## Evidence Collection

The core collector is backend-neutral and reads only data already owned by the
host runtime: ACP adapter diagnostics, persisted skill-run transcript/events, and
Zotero MCP runtime log entries near the smoke window.

Provider-specific collectors can add evidence. The Claude Code ACP collector
adds excerpts from `.claude/debug/<sessionId>.txt` and session JSONL when
available. Those excerpts are normalized into generic evidence events such as
backend tool discovery failure, backend tool absence, tool definitions visible,
or MCP tool call observed.

## Classification

The classifier chooses one of:

- `host_mcp_preflight_failed`
- `descriptor_not_injected`
- `backend_mcp_discovery_failed`
- `backend_mcp_tools_absent`
- `backend_mcp_tool_call_failed_transport`
- `model_ignored_available_tools`
- `smoke_timeout_unclassified`

Provider-specific strings such as Claude Code's `Failed to fetch tools:
terminated` are evidence only. They do not become schema fields.

## Runtime Integration

Callable smoke starts a diagnostic capture window. On smoke failure, the runner
collects evidence, writes `runtime/diagnostics/mcp-context-injection.json` and
`runtime/diagnostics/backend-mcp-evidence.log`, and includes classification,
confidence, and paths in the persisted run event and runtime log. Smoke success
keeps the existing behavior.

Zotero MCP request logging is enriched with redacted transport facts:
method/path/status, selected request headers, response character and byte
lengths, writer type, write duration, and close outcome. `tools/list` records
tool count and required synthesis tool presence.
