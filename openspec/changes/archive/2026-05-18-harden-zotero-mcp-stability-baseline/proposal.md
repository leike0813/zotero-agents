# Harden Zotero MCP Stability Baseline

## Why

The embedded Zotero MCP server is now a critical path for ACP skill execution,
but several protocol and transport edges can still turn bad agent input, large
Synthesis payloads, or long Zotero host calls into ambiguous failures. This
change applies the stability baseline from `artifact/mcp_design_guide.md` to the
current local MCP service without changing public tool names.

## What Changes

- Harden JSON-RPC request classification and tool argument validation.
- Return recoverable tool failures as structured tool results instead of
  transport-like failures where possible.
- Preserve real single-worker semantics when a running tool times out.
- Tighten local HTTP transport authorization, origin handling, request limits,
  and malformed request behavior.
- Add bounded paging/truncation behavior to high-volume Synthesis MCP reads.
- Keep existing tool names and ACP workflow declarations compatible.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `zotero-mcp-tools-stability`: strict protocol/schema handling, structured
  tool errors, and transport hardening.
- `zotero-mcp-concurrency-queue-policy`: running timeout behavior must not
  violate serialized host API execution.
- `zotero-mcp-guard-watchdog`: status diagnostics must expose timed-out running
  tools and retry guidance.
- `zotero-mcp-tool-suite`: tool registry contracts must include enforced schema
  validation and stable error metadata.
- `synthesis-mcp-tools`: Synthesis job-time reads must be bounded by paging or
  explicit include flags.

## Impact

- Affects `src/modules/zoteroMcpProtocol.ts`,
  `src/modules/zoteroMcpServer.ts`, and `src/modules/synthesis/service.ts`.
- Affects MCP core tests, queue tests, Synthesis MCP tests, and review input
  tests.
- Updates Zotero MCP service documentation.
- Does not introduce remote MCP, multi-instance task persistence, or breaking
  tool renames.
