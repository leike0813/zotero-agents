## Context

ACP required-MCP smoke is currently inferred from indirect signals such as
transcript projection, runtime logs, and embedded Zotero MCP diagnostics. Those
signals are not scoped tightly enough to the current ACP connection and prompt:
old prompts can keep running after a timeout, global logs can contain unrelated
runs, and backend-specific event shapes can make the same MCP exposure look
different across providers.

The new contract makes the host-owned MCP injection boundary the decision point.
The host wraps the MCP descriptors it injects into the ACP agent, observes
`tools/call` traffic for the current smoke span, and then leaves the same
gateway path in passive passthrough mode for formal MCP calls.

## Goals

- Make smoke success and failure decisions without transcript parsing, global
  runtime logs, or server-specific diagnostics.
- Scope smoke observations by `connectionId` and `smokeAttemptId` so old
  connections, old smoke prompts, and old gateway events cannot affect a new
  connection.
- Support host-injected HTTP/SSE and stdio MCP descriptors.
- During active smoke, short-circuit observed `tools/call` probes at the gateway
  and avoid invoking the real MCP server.
- Clear the smoke timeout as soon as all required tools are observed, even if
  the smoke prompt finishes later.
- Keep formal MCP calls on the same wrapped descriptor path in passive mode.
- Prevent a rejected recovered prompt chain from making later user replies fail
  immediately with the previous error.

## Non-Goals

- Do not validate MCP descriptors that the agent obtains from private
  configuration outside host injection.
- Do not prove business execution success for required tools; smoke proves that
  the current ACP session can reach the callable path.
- Do not replace the embedded Zotero MCP registry, permission policy, or
  concurrency queue.
- Do not fall back to transcript or runtime-log decisions when the gateway is
  unavailable.

## Decisions

### Gateway at the host injection boundary

The ACP adapter creates a unique `connectionId` and wraps the MCP descriptors it
passes to `newSession`, `loadSession`, or resume-equivalent session attachment.
HTTP/SSE descriptors are rewritten to local gateway URLs. Stdio descriptors are
rewritten to launch a host-provided stdio shim with a per-connection config.

This boundary is transport-level and server-agnostic. It observes MCP JSON-RPC
traffic without relying on the concrete server implementation behind the
descriptor.

### Active smoke spans are isolated

Each smoke attempt creates a unique `smokeAttemptId` with an isolated reached
set and required tool set. Gateway events count only when they match the current
active span for the same connection. Once the span is observed, finished, or
aborted, later events do not mutate its decision state.

### Active smoke short-circuits `tools/call`

During an active smoke span, the gateway records matching `tools/call` requests
and returns a synthetic successful MCP tool result without forwarding the call to
the real server. `initialize`, `tools/list`, notifications, and non-smoke
traffic keep their normal forwarding behavior.

This avoids side effects and queue pressure from smoke probes while still
proving that the ACP agent can issue the declared MCP callables through the
current descriptor path.

### Passive mode preserves formal calls

After all required tools are observed, the smoke deadline is cleared and the
gateway switches to passive passthrough. Formal MCP calls still pass through the
gateway, but the gateway does not rewrite responses, short-circuit calls, or
turn diagnostics into decisions. HTTP responses should stream where practical so
large business results are not fully buffered only for logging.

### Stdio uses a host shim

Stdio MCP descriptors are wrapped by replacing the original command with a host
shim command. The shim config is written under the run runtime directory and
contains the original command, args, env, cwd, observer endpoint, token,
`connectionId`, and descriptor identity.

The shim starts the real stdio MCP server and proxies JSON-RPC stdin/stdout. In
active smoke it reports tool calls to the observer endpoint and can return a
synthetic result for current-span smoke calls. Outside active smoke it preserves
stdin close, stdout/stderr forwarding, child exit, and backpressure behavior.
If the shim runtime cannot be resolved or started, the runner surfaces
`stdio_gateway_unavailable` and does not fall back to transcript inference.

### Smoke orchestration state machine

`runCallableMcpSmoke` starts a gateway smoke span and a 120 second observation
deadline. The span's `observed` promise resolves when all required tools have
been seen by the current connection and attempt. At that moment the deadline is
cleared, the run records `mcp-smoke-observed`, and the runner waits for the
smoke prompt to end naturally.

If the deadline fires before observation completes, the runner marks
`failed_timeout`, best-effort cancels the current adapter turn, aborts the span,
and does not send the business prompt. If the prompt ends before all tools are
observed, the runner marks `failed_missing`. If the prompt errors after
observation already completed, MCP smoke remains passed and the error is
recorded as warning evidence; connection loss remains a connection-layer
failure.

### Prompt chain recovery is local to each turn

ACP skill replies must not reuse a rejected recovered `promptChain` promise.
When a turn fails, the runner clears or replaces the chain state before accepting
the next user reply so that later prompts can start a new backend request rather
than synchronously replaying the old failure.

## Risks / Trade-offs

- The passive gateway adds one local hop to formal MCP calls. This is accepted
  to keep smoke and business traffic on the same descriptor path; tests should
  cover response equivalence and large-response forwarding.
- The stdio shim is more complex than HTTP proxying. It needs focused tests for
  process lifecycle, stderr, stdin close, exit propagation, and backpressure.
- Synthetic smoke does not prove the real tool business handler succeeds. That
  is intentional; the smoke contract is callable exposure, not business
  execution.
- After smoke is observed, the smoke timeout no longer guards prompt completion.
  Prompt completion remains controlled by the normal ACP turn/run lifecycle.

## Migration Plan

1. Add gateway interfaces and lifecycle management to the ACP adapter layer.
2. Add HTTP/SSE descriptor wrapping and passive streaming proxy behavior.
3. Add stdio shim descriptor generation and the shim runtime entrypoint.
4. Rewrite callable smoke orchestration to consume gateway span observation.
5. Remove transcript, global runtime log, and embedded-Zotero diagnostics from
   smoke decision paths while retaining them as redacted non-decision evidence.
6. Fix recovered prompt-chain state so failed turns do not poison later replies.
7. Add focused transport, orchestration, recovery, and diagnostic tests.
