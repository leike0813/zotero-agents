# Design

## Protocol and Tool Validation

The MCP protocol layer treats only omitted `id` as a notification. `id: null`,
non-string/non-number ids, malformed request shapes, unknown methods, and
unknown tools remain JSON-RPC errors. Tool argument validation runs centrally
from registry `inputSchema` before handler invocation.

The validator supports the subset used by the current registry: object
properties, `required`, `additionalProperties=false`, scalar and union `type`,
`enum`, numeric `minimum/maximum`, string `minLength/maxLength/pattern`, and
array `minItems/maxItems/items`. Handlers may still perform business validation
for resource existence, permissions, and state.

Recoverable tool execution failures return MCP tool results with `isError=true`
and stable structured fields: `error_code`, `retryable`, `retry_after_ms`, and
`tool`. Protocol errors continue to use JSON-RPC errors.

## Queue Timeout Semantics

`tools/call` remains a single FIFO worker for all host API calls except
`get_mcp_status`. A running timeout may return a JSON-RPC timeout error to the
caller, but the queue must keep the running slot occupied until the underlying
handler promise settles. This avoids starting a second Zotero host call while
the timed-out call is still executing.

MCP status exposes whether the active tool has timed out but is still running,
the active tool name, started time, timeout threshold, queue state, and a retry
guidance string.

## HTTP Transport Hardening

The local Streamable HTTP endpoint keeps `127.0.0.1` binding. Authorization is
accepted only through `Authorization: Bearer <token>`; query-string token auth is
disabled. Requests with an `Origin` header must match localhost or the configured
local allowlist. The server rejects oversized request bodies and malformed
query/header parsing with structured HTTP/JSON-RPC responses instead of listener
fatal errors.

Token generation requires a crypto-grade random source. If no secure random
source is available, MCP startup fails rather than emitting a weak token.

## Bounded Synthesis Reads

Synthesis MCP tools remain read-oriented except
`synthesis.export_paper_artifact_bundle`, which writes only inside an ACP skill
run workspace and returns a compact receipt.

High-volume Synthesis reads must page or truncate:

- `synthesis.get_paper_registry` accepts `paperRefs`, `cursor`, and `limit`.
- `synthesis.resolve_resolver` accepts `cursor` and `limit`, and returns
  `next_cursor`, `has_more`, `total`, and `returned`.
- `synthesis.get_library_index` honors `includeTags`, `includeCollections`, and
  `includeItems`; omitted include flags default to a compact page.
- `synthesis.get_topic_context` returns summary context by default; full
  artifact/markdown fields require explicit include flags.
- `synthesis.get_review_input` enforces graph and text limits and reports
  truncation diagnostics.

## Compatibility

Tool names and workflow `execution.mcp.requiredTools` stay unchanged. Existing
agents can keep calling current tools, but oversized or under-specified calls
receive clearer errors or bounded output with next-call guidance.
