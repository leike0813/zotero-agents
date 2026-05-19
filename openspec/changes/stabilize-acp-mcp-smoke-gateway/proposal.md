## Why

ACP required-MCP smoke currently relies on indirect evidence such as
transcript/tool-call projection and global runtime logs. That makes smoke
results vulnerable to cross-run contamination, lingering timed-out prompts, and
backend-specific event shapes, which has caused ACP skill runs to fail or
recover unreliably.

This change rebuilds smoke around host-owned MCP transport observation so the
runner can prove current-session callable exposure without depending on any
particular MCP server implementation.

## What Changes

- Add a host-side MCP smoke gateway that wraps MCP descriptors injected into ACP
  sessions and observes `tools/call` traffic by `connectionId` and
  `smokeAttemptId`.
- Support both HTTP/SSE descriptors and stdio descriptors through transport
  wrappers, with stdio handled by a host-provided shim.
- During active smoke, short-circuit required `tools/call` probes at the gateway
  so the underlying MCP server does not execute side-effectful or slow business
  calls.
- After all required tools are observed, clear the smoke timeout immediately and
  keep the gateway in passive passthrough mode for the rest of the prompt and
  subsequent business calls.
- Increase callable smoke timeout to 120 seconds.
- Remove smoke success/failure decisions based on transcripts, global runtime
  logs, or embedded Zotero MCP server diagnostics.
- Ensure recovered ACP skill replies are not poisoned by a previously rejected
  prompt chain.

## Capabilities

### New Capabilities

- `acp-mcp-smoke-gateway`: Defines host-side MCP gateway behavior for transport
  wrapping, smoke observation, active-smoke short-circuiting, passive passthrough,
  and per-connection isolation across HTTP/SSE and stdio MCP descriptors.

### Modified Capabilities

- `zotero-mcp-tool-suite`: Existing ACP callable-smoke, timeout, and diagnostic
  requirements move from transcript/runtime-log/backend-specific evidence to
  gateway-derived decisions with non-decision evidence retained only for
  diagnostics.
- `acp-skillrunner-compatible-runner`: ACP skill run recovery must not let a
  previously rejected prompt chain poison subsequent user replies.
- `acp-embedded-zotero-mcp-server`: ACP session MCP injection must allow the
  embedded Zotero MCP descriptor to be wrapped by the host gateway while
  preserving safe diagnostics and availability semantics.

## Impact

- Code: ACP connection adapter, ACP skill runner orchestration, MCP context
  diagnostics, runtime prompt template text, and new MCP gateway/shim modules.
- Runtime behavior: required-MCP ACP skill runs will observe current-session MCP
  callability through gateway spans and will no longer use global runtime logs or
  transcripts for smoke decisions.
- Tests: gateway transport tests, smoke orchestration regression tests, session
  recovery tests, and existing embedded Zotero MCP injection tests.
- Compatibility: host-injected HTTP/SSE and stdio MCP descriptors are wrapped by
  the gateway; agent-private MCP configurations outside host injection remain
  out of scope for this smoke contract.
