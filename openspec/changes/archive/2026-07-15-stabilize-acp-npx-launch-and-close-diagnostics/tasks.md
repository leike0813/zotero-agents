## 1. Regression Tests First

- [x] 1.1 Extend ACP transport tests for immediate Mozilla stdout/stderr draining and bounded finalized close snapshots.
- [x] 1.2 Extend ACP client connection tests for local-close, remote-EOF, and receive-error structured close results.
- [x] 1.3 Add deterministic npx launch-cache policy tests for direct/wrapped recognition, explicit cache authority, stable safe keys, generation rollover, retry classification, and single-flight leases.
- [x] 1.4 Extend adapter/integration tests for one bounded cache retry, full failed-attempt cleanup, error-priority behavior, and suppressed close publication from replaced attempts.

## 2. Runtime and Cache Implementation

- [x] 2.1 Implement `acpNpxLaunchCache.ts` as the SSOT for npx detection, plugin cache generations, persistent active generation, safe identity, and keyed leases.
- [x] 2.2 Update Mozilla ACP transport startup and close finalization so pipes drain from spawn time and close snapshots wait within a bound.
- [x] 2.3 Update `AcpClientConnection.closed` to resolve structured close origin and reason without changing its awaitable property shape.

## 3. Shared Adapter Integration

- [x] 3.1 Refactor ACP adapter initialization into independently cleanable attempts and apply cache policy at the adapter-to-transport boundary.
- [x] 3.2 Add narrow managed-cache conflict classification, one generation rollover retry, and bounded `npx_cache_retry` diagnostics.
- [x] 3.3 Preserve actionable failure priority and publish lifecycle only for the final initialized connection.

## 4. Suite and Documentation Integration

- [x] 4.1 Add the deterministic ACP integration fixture to the Zotero core suite entrypoint with a positive executed-count assertion while keeping real OpenCode coverage opt-in.
- [x] 4.2 Update ACP transport and backend preset documentation for pipe finalization, structured close causes, plugin-owned npx cache, explicit cache authority, and generation rollover.

## 5. Verification

- [x] 5.1 Run focused Node ACP transport, client, cache, adapter, SessionManager lifecycle, backend probe, ACP Skills, and ACP Chat tests.
- [x] 5.2 Run the explicit real OpenCode Node ACP integration test and record environmental skips or failures separately from deterministic gates.
- [x] 5.3 Run targeted Zotero core tests and verify the executed test count is greater than zero.
- [x] 5.4 Run runtime diagnostics release-elision, TypeScript no-emit, focused lint/checks, and OpenSpec validation.

## 6. Inherited Cache Bypass Correction

- [x] 6.1 Add policy and adapter regressions proving a host-inherited npm cache is replaced while an explicitly configured backend cache remains authoritative.
- [x] 6.2 Remove effective-environment cache authority, retain only explicit backend-environment authority, and emit a bounded managed-cache selection diagnostic.
- [x] 6.3 Correct the backend preset documentation and rerun focused, release-elision, type, lint, OpenSpec, build, and real Kilo adapter verification with an inherited npm cache.
