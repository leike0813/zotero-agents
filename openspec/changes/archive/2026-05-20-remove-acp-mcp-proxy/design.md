## Context

The gateway approach attempted to prove current-session MCP callability by
wrapping ACP MCP descriptors and observing `tools/call` traffic. Recent runs
showed that this path can prevent backends from discovering tools at all: the
backend initializes the descriptor but never registers `mcp__zotero__...`
callables, and formal MCP calls then fail as well.

Because MCP descriptors are passed to third-party ACP backends, a host-side
transport proxy is not a reliable compatibility contract. The stable boundary is
the direct descriptor that the backend already knows how to consume.

## Decisions

### Direct descriptors only

ACP session creation, loading, and resume attachment pass the embedded Zotero
MCP descriptor returned by `ensureZoteroMcpServer()` directly in `mcpServers`.
The adapter must not wrap descriptor URLs, rewrite stdio descriptors, inject a
gateway auth layer, or keep a gateway in passive mode for formal calls.

### Preflight is the blocking readiness gate

For workflows that declare required MCP tools, the host keeps the existing
preflight:

- backend must advertise HTTP MCP support before session prompting;
- the embedded Zotero MCP tool registry must contain every required tool.

If preflight succeeds, the runner sends the business prompt with the required
MCP guard. It does not send a separate smoke prompt and does not wait for
transcript, runtime-log, backend-debug, or gateway observation evidence.

### Diagnostics no longer decide smoke

MCP context diagnostics can remain useful as general evidence when formal tool
calls later fail, but there is no longer a blocking smoke decision to diagnose.
Gateway fields such as `decisionSource = "mcp-gateway"`, `connectionId`,
`smokeAttemptId`, and `transportKinds` must be removed from runtime decisions
and persisted smoke result shapes.

### Prompt-chain recovery stays

The non-proxy fix from the superseded gateway change remains required: recovered
ACP skill replies must not reuse a rejected `promptChain` promise as the base of
later user replies.

## Migration

1. Delete the unarchived gateway OpenSpec change.
2. Add this replacement change with delta specs that remove the archived smoke
   requirements and explicitly forbid proxy-wrapped injected descriptors.
3. Delete gateway runtime and gateway tests.
4. Remove smoke orchestration and template references from the ACP runner.
5. Update tests and prompt wording to reflect preflight-only required-MCP
   readiness.
