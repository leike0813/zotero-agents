## 1. Baseline and Wiring Points

- [x] 1.1 Locate current ACP session descriptor injection, callable smoke orchestration, diagnostics persistence, and prompt-chain state ownership.
- [x] 1.2 Add characterization tests for the current prompt-chain recovery failure so a second reply after a rejected prompt chain must start a new prompt.
- [x] 1.3 Add characterization tests proving smoke decisions do not depend on transcript or global runtime-log entries.

## 2. Gateway Interfaces and Lifecycle

- [x] 2.1 Add `src/modules/acpMcpGateway.ts` with connection lifecycle, `connectionId`, smoke span creation, span observation, `finish()`, and `abort(reason)` behavior.
- [x] 2.2 Extend the ACP connection adapter contract with descriptor wrapping and smoke span APIs.
- [x] 2.3 Wire each ACP adapter instance to create one gateway connection and release gateway listeners on adapter close.
- [x] 2.4 Add unit tests for span isolation across old connections and old `smokeAttemptId` values.

## 3. HTTP and SSE Gateway

- [x] 3.1 Add tests for HTTP/SSE active-smoke `tools/call` short-circuiting, including JSON-RPC batch response ids.
- [x] 3.2 Implement HTTP/SSE descriptor wrapping to local gateway URLs with redacted forwarding metadata.
- [x] 3.3 Implement active-smoke `tools/call` observation and synthetic MCP tool results without forwarding to the upstream server.
- [x] 3.4 Implement passive HTTP/SSE passthrough for `initialize`, `tools/list`, notifications, formal `tools/call`, and non-smoke traffic.
- [x] 3.5 Add tests that passive responses match direct upstream behavior and large responses are not fully buffered only for diagnostics.

## 4. Stdio Gateway Shim

- [x] 4.1 Add tests for stdio shim forwarding of `initialize`, `tools/list`, non-smoke `tools/call`, stderr, stdin close, child exit, and startup failure.
- [x] 4.2 Implement per-connection stdio shim config generation under the run runtime directory with token and descriptor metadata redaction.
- [x] 4.3 Implement the stdio shim entrypoint that starts the real MCP child process and proxies JSON-RPC stdin/stdout.
- [x] 4.4 Implement active-smoke stdio observation and synthetic results without sending smoke `tools/call` requests to the real child.
- [x] 4.5 Surface `stdio_gateway_unavailable` when the shim runtime cannot be resolved or started, without transcript fallback.

## 5. Smoke Orchestration

- [x] 5.1 Add orchestration tests for gateway-observed success without transcript/runtime-log evidence.
- [x] 5.2 Add orchestration tests for 120 second timeout, best-effort adapter cancel, and span release when required tools are missing.
- [x] 5.3 Add orchestration tests proving timeout is cleared immediately after all required tools are observed, even if the smoke prompt ends later.
- [x] 5.4 Rewrite `runCallableMcpSmoke` to use gateway span observation rather than transcript, global runtime logs, or embedded server diagnostics.
- [x] 5.5 Record smoke results with `decisionSource`, `connectionId`, `smokeAttemptId`, `transportKinds`, `reachedTools`, `missingTools`, and optional non-decision evidence file.
- [x] 5.6 Treat prompt errors after successful observation as warning evidence while leaving connection-layer failures to connection handling.

## 6. Diagnostics, Cleanup, and Recovery

- [x] 6.1 Remove smoke success and failure decisions based on global runtime logs, transcript projection, or Zotero-specific diagnostic listeners.
- [x] 6.2 Keep transcript, runtime log, and embedded MCP diagnostics only as redacted `nonDecisionEvidence`.
- [x] 6.3 Fix embedded Zotero MCP diagnostic listener lifecycle so adapter close unsubscribes listeners and old adapters cannot report into new runs.
- [x] 6.4 Fix recovered ACP prompt-chain rejection handling so later user replies do not reuse a rejected promise.
- [x] 6.5 Update ACP runtime smoke and guard prompt rendering only where wording must reflect gateway-observed smoke.

## 7. Verification

- [x] 7.1 Run the focused node/unit test subset covering ACP MCP gateway, callable smoke orchestration, diagnostics, and prompt-chain recovery.
- [x] 7.2 Run the project TypeScript/build check used by this repository for ACP modules.
- [x] 7.3 Run `openspec validate stabilize-acp-mcp-smoke-gateway --strict`.
- [x] 7.4 Manually inspect the change diff to ensure no unrelated dirty worktree files were modified.
