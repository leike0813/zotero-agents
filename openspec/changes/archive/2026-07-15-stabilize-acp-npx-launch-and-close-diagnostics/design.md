## Context

ACP stdio backends can be launched by a direct executable, by `npx`, or by a runtime wrapper such as `uv ... -- npx ...`. Today these launch shapes converge at `acpConnectionAdapter`, but npm cache selection is inherited from the host environment. npm's shared `_npx` materialization can race across launches and fail during an internal rename. Separately, the Mozilla transport performs asynchronous process identity work before attaching stderr/stdout drains, and `AcpClientConnection.closed` reduces receive-loop failures to an untyped completion signal. Together these behaviors make a recoverable npm cache race appear as an opaque ACP protocol close.

The implementation must run in Zotero's Mozilla environment as well as Node test adapters. It cannot depend on Node-only filesystem or crypto APIs, cannot mutate user npm state, and must reuse the project's platform path/filesystem/subprocess abstractions. ACP Chat, ACP Skills, and backend probes must share one policy boundary.

## Goals / Non-Goals

**Goals:**

- Isolate implicit npx launches in a plugin-owned cache and serialize first materialization for the same normalized launch identity.
- Recover once from the narrow npm `_npx` rename `ENOTEMPTY`/`EEXIST` failure class by selecting a fresh cache generation.
- Preserve stderr and receive-loop failures across fast subprocess exit and expose a deterministic close diagnostic.
- Keep retry attempts invisible to connection lifecycle consumers until one logical initialize operation has settled.
- Lock the behavior with deterministic Node fixtures and an actually selected Zotero core test.

**Non-Goals:**

- Cleaning, repairing, or migrating the user's `~/.npm` cache.
- Retrying authentication, model, ACP protocol, arbitrary npm, or arbitrary process failures.
- Changing ACP JSON-RPC, backend profile schemas, transcript projection, or runtime dependency resolution.
- Making external OpenCode/Kilo availability a default test-suite dependency.

## Decisions

### 1. One launch-cache policy module owns npx recognition and generations

`acpNpxLaunchCache.ts` will accept the resolved backend identity and transport launch input, detect either a direct npx command or the first command after an explicit `uv ... --` separator, and extract the npx package spec from the post-npx arguments. It returns an immutable launch attempt descriptor containing an environment overlay, sanitized cache identity, generation, and a lease release function.

The stable cache key is derived from normalized backend id, npx executable identity, and package spec. It excludes the complete command line, arbitrary environment values, auth material, and credentials. The active generation is stored beneath `runtime/cache/acp-npx/<cache-key>` and each generation has a distinct cache directory. Existing runtime persistence and filesystem abstractions provide path and atomic file operations.

Alternative considered: setting one global plugin npm cache. This still allows unrelated packages and concurrent backends to race in one `_npx` tree and gives no safe generation rollover boundary.

### 2. Explicit npm cache configuration is authoritative

Environment keys are compared case-insensitively for `NPM_CONFIG_CACHE`. If either spelling is explicitly present in the backend launch environment, policy returns a no-management result. The adapter still preserves stderr diagnostics but never injects, deletes, or rotates that path.

The backend profile environment is the authority boundary. A cache value inherited from the Zotero host process is not explicit backend configuration and must be replaced by the managed cache overlay. In particular, npm-based development launchers inject `npm_config_cache` into the host environment even when the backend profile does not configure it; treating that inherited value as explicit would silently bypass isolation and return npx materialization to the shared user cache.

Alternative considered: override all npx caches for consistency. This would violate backend configuration authority and could conceal user-managed cache policies.

### 3. Initialization uses a keyed lease and a replaceable attempt

A module-local keyed promise chain serializes initialize attempts with the same cache key. The lease covers transport construction through ACP `initialize` settlement, because npm materialization can continue until the agent has initialized. Waiters acquire the current active generation only after the prior lease releases.

`acpConnectionAdapter` will express a launch as an attempt object with connection, transport, listener publication state, and idempotent cleanup. The adapter applies the policy only at this shared boundary. On a managed-cache rename conflict it closes and drains the failed attempt, rotates the active generation atomically, emits a bounded `npx_cache_retry` diagnostic, and starts exactly one replacement attempt. Attempt-local close callbacks are not connected to SessionManager until the logical initialize succeeds, so the replaced attempt cannot publish `acp-connection-closed`.

Alternative considered: retry within each ACP Chat, Skills, and probe caller. That duplicates policy, risks inconsistent cleanup, and breaks the adapter's role as the single transport boundary.

### 4. Retry classification requires all narrow failure signals

Recovery requires a managed cache, a non-successful initialize, npm cache-path rename context containing `_npx`, rename operation context, and either `ENOTEMPTY` or `EEXIST`. Classification consumes the finalized structured close/transport snapshot; it does not use backend id, provider name, agent family, or a package-specific string. The retry budget belongs to the logical initialize call and is one.

Alternative considered: retry any nonzero npx exit. That can duplicate prompts or hide stable configuration, network, authentication, and package errors.

### 5. Pipes drain from spawn time and close has a structured result

The Mozilla subprocess transport starts stdout and stderr consumers immediately after process creation, before optional process identity discovery. Its `closed` completion waits a bounded interval for both consumers after process settlement and then freezes the final exit/stderr snapshot.

`AcpClientConnection.closed` resolves to a structured result with origin (`local`, `remote-eof`, or `receive-error`) and optional reason/error while retaining the same awaitable property shape. The adapter selects the user-facing failure in this order: receive-loop error, drained stderr, nonzero exit code, generic connection close. Active local cleanup remains distinguishable from a remote failure.

Alternative considered: attach an additional error callback while leaving `closed` void. That creates two competing lifecycle sources and retains the race between error and close consumers.

### 6. Deterministic fixtures gate integration selection

Node tests use fake transports/subprocesses for fast stderr, close-origin, retry classification, generation rollover, explicit-cache, non-npx, concurrency, and lifecycle publication behavior. The real external OpenCode test stays opt-in. A deterministic Zotero-compatible fixture is included by the core suite entrypoint and the runner/selection assertion verifies a positive executed count, preventing a grep filter that reports `0 passed` from satisfying the gate.

## Risks / Trade-offs

- [A crashed plugin can leave an in-process lease unresolved] → Lease settlement is placed in `finally`; process restart clears the in-memory chain and persistent active generation remains usable.
- [Generation directories accumulate after rare failures] → No launch-path deletion is attempted; existing plugin cache governance owns later retention and cleanup.
- [stderr wording changes across npm versions] → Classification combines error code, rename semantics, and `_npx` context instead of one full-message match.
- [Bounded pipe draining can still truncate a hung pipe] → Keep the timeout finite, retain the captured tail, and distinguish timeout state in the snapshot.
- [Hash/key implementation differs by runtime] → Use an existing runtime-safe deterministic identifier helper or a small pure TypeScript hash, never Node crypto.
- [Host launch tooling injects an npm cache value] → Determine explicit-cache authority from the backend profile environment only; inherited process values remain ordinary defaults that the managed overlay replaces.

## Migration Plan

No user-data migration is required. Existing backend profiles continue to launch unchanged except that implicit npx cache selection gains a plugin environment overlay. The first launch creates generation metadata lazily. Rollback removes the policy injection and leaves plugin-owned cache directories as ordinary governed cache data; user npm state is untouched.

## Open Questions

None. Automatic recovery is deliberately limited to plugin-managed caches and one retry.
