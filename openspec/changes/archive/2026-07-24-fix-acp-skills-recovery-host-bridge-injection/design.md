## Context

Initial ACP Skills execution materializes a run-scoped Host Bridge profile and CLI shims, merges the shim and resolved CLI directories into PATH, and injects the profile and token into the backend before dependency wrapping. Conversation recovery previously resolved a fresh backend and created a fresh adapter without repeating that preparation. The recovered process therefore inherited only the system environment even though the run directory still contained Host Bridge artifacts.

The solution must not persist a plaintext token, must honor an explicitly disabled Zotero host-access declaration, must remain compatible with Zotero's non-Node runtime, and must not make the shim the sole path to the resolved CLI binary.

## Goals / Non-Goals

**Goals:**

- Give a recovered ACP process the same run-scoped Host Bridge environment contract as initial execution.
- Keep host-access resolution, materialization, state summarization, and backend wrapping in one implementation path.
- Refresh transient credentials at recovery time rather than restoring secrets from persistence.
- Make the POSIX shell shim directly executable through the existing runtime filesystem abstraction.
- Preserve explicit host-access disablement and masked persistence.

**Non-Goals:**

- Changing Host Bridge authentication, profile schema, HTTP protocol, or CLI command behavior.
- Persisting Host Bridge tokens or modifying the ACP Skills run-store schema.
- Removing the resolved CLI directory from PATH.
- Changing Windows `.cmd` shim behavior.
- Fixing unrelated transcript repetition or literature-ingest metadata validation.

## Decisions

### One preparation path owns initial and recovered Host Bridge setup

The orchestrator uses one internal preparation function to resolve `zotero_host_access`, invoke the injectable materializer, summarize the result, and wrap the backend environment. Initial execution and recovery both call this function. Recovery calls it after reconstructing the effective request and before dependency probing or adapter creation.

This is preferred over duplicating the initial block in recovery because the duplicated paths would remain vulnerable to future environment and policy drift.

### Recovery rematerializes transient access

Recovery rebuilds the profile and shims in the existing workspace and obtains the current Host Bridge token. It does not read a token from the run record. When the persisted request or file-backed request context is unavailable, recovery uses the existing default policy of required host access with write auto-approval disabled.

This is preferred over restoring the old environment because the token and auto-approval grant are runtime capabilities whose validity must be established at recovery time.

### Only a masked summary enters canonical run state

The wrapped backend carries the plaintext token only to process creation. Run state and events receive `summarizeHostBridgeCliRunInjection` output, which contains masked token metadata and paths but not the token. Runtime catalog recording continues to use the unwrapped configured backend.

### POSIX permission repair uses the runtime filesystem SSOT

After writing the shell shim, materialization calls `setRuntimeExecutablePermissions`. That abstraction already selects Zotero file objects, XPCOM, or Node filesystem support and is a no-op on Windows. The injected PATH continues to contain both the shim directory and the resolved CLI directory.

This is preferred over importing `node:fs` into Host Bridge injection because the plugin must run in Zotero 7 and Zotero 9.

### Preparation failures fail recovery explicitly

If recovery-time Host Bridge preparation throws, the run leaves `connecting`, records `conversationRecoveryState: failed`, and publishes the existing recovery-failed event instead of leaving a misleading recoverable connection state.

## Risks / Trade-offs

- **Recovery performs additional filesystem and Host Bridge readiness work** → Reuse the existing workspace paths and materializer; the work is required before launching a process that depends on those credentials.
- **Repeated recovery can issue a replacement auto-approval grant** → The existing registry revokes prior grants for the same request before issuing the replacement.
- **A platform without any executable-permission API cannot repair the shim** → Keep the resolved CLI directory in PATH as a functional fallback and rely on the existing cross-runtime permission implementations for supported platforms.
- **Fallback request reconstruction may not preserve a missing explicit declaration** → Use the established least-privilege default for write approval and persist the original request/context in normal execution paths.

## Migration Plan

No data migration is required. Existing recoverable runs use their persisted request payload or `run-context.json` on the next recovery. Deployment consists of shipping the orchestrator and shim materialization changes together. Rollback requires only reverting these code paths; no stored data or profile format needs conversion.

## Open Questions

None.
