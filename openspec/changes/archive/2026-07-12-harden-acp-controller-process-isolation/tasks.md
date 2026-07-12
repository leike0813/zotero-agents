## 1. Shared Controller Contract

- [x] 1.1 Extend ACP transport lifecycle types with normalized EOF, graceful-exit, close-reuse, ownership-validation, TERM/KILL, direct-fallback, and possible-descendant outcomes without sensitive identity values.
- [x] 1.2 Wrap the `launchAcpTransport()` return boundary with one idempotent close promise that stops new writes, drains queued writes, requests bounded stdin EOF, and keeps the existing transport API.
- [x] 1.3 Ensure adapter closure rejects pending JSON-RPC work and all launch/initialize/session failure paths settle through the controlled transport without unbounded waits.

## 2. Fail-Closed Platform Teardown

- [x] 2.1 Add POSIX supervisor identity capture for launch token, subprocess PID, actual PGID, and actual SID using runtime-compatible process identity queries.
- [x] 2.2 Require fresh pidfile/token/PID/PGID/SID validation before group TERM and independently before group KILL; reject missing, malformed, stale, changed, or unqueryable identities.
- [x] 2.3 Implement bounded direct subprocess fallback after failed validation or TERM delivery and report possible wrapper descendants without attempting an unverified negative-PID signal.
- [x] 2.4 Align Mozilla POSIX, Node POSIX, and Windows bridge ownership lifecycle semantics and expose process-identity-query capability in startup preflight without blocking ordinary ACP launch.

## 3. Controller and Adapter Regressions

- [x] 3.1 Extend transport tests for full identity match, PGID/SID mismatch, unavailable identity, stale/corrupt/token-mismatched pidfile, identity change before KILL, TERM failure, EOF graceful exit, bounded fallback, and concurrent close.
- [x] 3.2 Cover wrapper isolation so closing one controller cannot signal its parent user session, an unrelated sibling, or another active controller.
- [x] 3.3 Extend connection adapter tests for initialize/new/load/resume/prompt close, write failure, initialization cleanup, pending request rejection, EOF-first ordering, bounded completion, and idempotency.
- [x] 3.4 Assert normalized ownership lifecycle semantics for Mozilla, Node, and Windows transport test doubles without locking complete logs or UI text.

## 4. Business-Path Regressions

- [x] 4.1 Verify backend probe and cache-refresh success, initialize timeout, session creation failure, adapter diagnostic, and raw diagnostic all close only their temporary shared controller.
- [x] 4.2 Verify ACP Chat disconnect, eviction, initialization failure, reconnect, backend removal, and shutdown continue through the shared controller.
- [x] 4.3 Verify ACP Skills normal execution, recovery, sequence steps, cancel, hard timeout, apply detach, failure cleanup, and shutdown preserve awaited lifecycle behavior through the shared controller.

## 5. Validation

- [x] 5.1 Run targeted ACP transport, connection, backend probe/cache refresh, ACP Chat lifecycle, and ACP Skills runner tests, including an isolated process-group harness for the no-unrelated-signal invariant.
- [x] 5.2 Run `npx tsc --noEmit`, Prettier check, and ESLint for affected files without auto-writing.
- [x] 5.3 Run `npm run test:node:core`, isolate any unrelated existing failures, and record the relevant outcome.
- [x] 5.4 Run `openspec validate harden-acp-controller-process-isolation --strict`, `git diff --check`, and workspace status review without modifying existing `typings/i10n.d.ts` changes.
