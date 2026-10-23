# Design

## Context

See proposal.md for the observed lifecycle failures. Native composition currently checks an active flag around recovery, duplicates two input staging loops, and creates a deadline only after staging. Production RPC already supports parent cancellation and explicit remaining deadlines; `src/utils/wait.ts` supplies lightweight cancellation and bounded local waits. Default-client generation coordination already tracks asynchronous disposal.

## Goals / Non-Goals

**Goals:** One private native operation owner with synchronous invalidation, bounded local waits, transfer cleanup, and a reusable drain barrier; preserve DTO validation and business audit/trace semantics.

**Non-Goals:** No Rust lifecycle/protocol/TTL changes, new configuration or dependency, production test-only API, automatic maintenance cancel/retry, or library lexical owner changes. High-level `getTopicContext` may compose several native calls plus Host delivery; it is not redefined as one native capability transaction.

## Decisions

### Private per-composition owner

Add `createNativeOperationOwner()` inside nativeComposition.ts rather than a new scheduling module. Its `run(operation, execute)` registers a scope and completion barrier before execute; `invalidate()` marks inactive and aborts business-phase scopes synchronously; `dispose()` returns one cached promise draining completion barriers, not user result promises. Reject future calls with `unavailable("composition_disposed")` before connection access. Share the owner between composition nativePort and evidenceRetrieval; the standalone evidence port has its own private owner without expanding its public interface.

Each scope exposes only `deadlineAtMs`, `signal`, `callOptions`, `checkActive`, `wait`, and `deferCleanup`. Record the manifest transport deadline before recovery or DTO work. Reuse `createCancellationController`; its signal is structurally consumed by bounded waits and cast to AbortSignal at the native RPC seam. Production RPC constructs the real fetch signal, so environments without native AbortController still terminate local waits. Do not use AbortSignal.any/timeout or document.

`checkActive` gives cancellation precedence over expiry, mapping to RPC `request_canceled` / `request_timeout`, then the existing client normalizer (`unavailable` / `timeout`, preserving sidecarCode). `callOptions` checks and returns that signal and remaining milliseconds. `wait` uses `waitForBoundedPromise` and maps only BoundedWaitError; other errors propagate. Check after awaits and before effects and audit success. Keep one audit/trace start and terminal with existing semantic non-success classification. A validated result entering cleanup is no longer reinterpreted by later invalidation.

### One staging path and one budget

Replace stageTopicAssets and stageProductionClientRequest with stageContentTransfer accepting the existing transfer builders' union. Preserve Topic-assets-first selection, controlTargetBytes, hashes, pages, DTOs, and wire fields. Begin/page/seal each use scope.callOptions and bounded scope.wait. Register known-session cancel immediately after begin returns and before the active check. Rebuilt staged DTOs and business RPC remain in the same scope; remove business-local staged finally and fresh deadline creation.

CPU construction cannot be preempted; check after construction before network effects. A begin request without a received session ID cannot be canceled by invented identity: stop local waiting and leave any unknown session to existing idle five-minute / absolute thirty-minute server reaping.

### Independently bounded cleanup and output reads

Scope finally executes registered input-session cleanup with an independent 1000 ms bounded wait; cancel uses the original connection/RPC, deadlineMs 1000, and no business signal. Ignore cleanup errors, then remove scope and resolve its completion barrier. This avoids drain rejection and protects the business primary error.

Add optional signal to consumeSynthesisSidecarOutputJson. Check cancellation before calculating remaining deadline, after manifest/page awaits, and after final parsing. Preserve all manifest/page/hash/JSON validation and cancelAfterRead:false. Output finally uses independent deadlineMs 1000, no business signal, and bounded local wait.

Native resolveContentTransferResult receives the scope's absolute deadline and signal. Supply a contextual typed NativeRpcClient adapter that only bounds rawRpc.call with the call's own signal/deadline and maps BoundedWaitError. Do not overwrite options or catch business results. This ensures output finally runs even for injected RPCs ignoring cancellation; do not race the entire output consumer against scope cancellation, which would drain before output cleanup. Input cleanup and output cleanup can add two independent one-second tails. Reverse Host retains its original deadline and cancelAfterRead:false without a new owner signal.

### Durable maintenance remains Rust-owned

Local cancellation never calls maintenance control and never claims remote rollback. An accepted operation retains identity and can complete after disposal; replacement composition reads its existing ID. No native worker wait is added to dispose. Default-client lifecycle should need no implementation change: demonstrate generation cleanup/fresh/shutdown integration through its public seam.

## Risks / Trade-offs

- Unknown begin session → rely on existing server reaping; report local cancellation only.
- Non-cooperative injected RPC or fetch → reuse bounded waits / production RPC race; ignore late results and block later effects.
- Main-thread synchronous preparation → cannot interrupt CPU, but prohibit subsequent network effects after deadline.
- Cleanup may fail or time out → preserve primary outcome, bound local drain; no claim of confirmed remote cleanup.
- Local cancellation after remote admission → not proof of rollback; durable operation remains queryable.

## Migration Plan

No persistent migration. Complete delta artifacts and strict validation before apply. Implement vertical red/green slices through existing composition/RPC/default-client seams; update only affected production files, tests, and existing lifecycle documentation. Run direct native-stage1 Mocha suites, build current Rust sidecar and run selected real routes, then run an ephemeral real-HTTP production-TS staging cancellation smoke. Do not build the plugin, install dependencies, commit, archive, or publish. Reverting the source changes requires no data rollback.
