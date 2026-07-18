## Context

`createSynthesisService()` currently imports Git/WebDAV prefs modules, constructs a prefs-configured Git adapter, lets `webDavSync.ts` construct its default HTTP client and read the encrypted credential, and returns ten configuration facade methods. Exact search shows those ten methods have no caller outside the service inventory; Preferences hooks already own status/save/clear/test and invalidate the default client after changes.

## Goals / Non-Goals

**Goals:**

- Keep application sync orchestration free of Zotero prefs, encrypted credentials, default network clients, and Git command construction.
- Remove the ten dead configuration methods and their obsolete invalidation callback.
- Preserve current Git/WebDAV runtime state, commands, durable bundle, conflict, progress, and UI behavior.
- Make direct and readonly service construction safely disabled unless explicit runtime capabilities are injected.

**Non-Goals:**

- Retiring hidden/deprecated Git Sync or changing its command surface.
- Moving durable-sync filesystem/repository work into the Host port.
- Changing Preferences UI, database schemas, remote paths, bundle formats, retry policies, or activating a sidecar process.

## Decisions

### Use a semantic WebDAV Host port, not a credential provider

Add a strict `SynthesisHostWebDavSyncPort` with `describe`, `readText`, `writeText`, and `ensureCollection`. Requests carry only managed relative paths, text, and optional ETag preconditions. Results are canonical status unions. The production adapter owns prefs, URL construction, credential reads, Basic authentication, and the default HTTP client. A `readCredential(): string` binding is rejected because it would move the secret out of `service.ts` while still exposing it to application orchestration.

### Keep WebDAV configuration live

The adapter reads current prefs and credential for every remote operation. `describe` returns only the sanitized projection needed by existing state: config status, sanitized base URL, remote path, username, credential timestamp, connection-test projection, and diagnostics. No credential, Authorization header, credential-bearing URL, callback payload, or raw error crosses the port.

### Reuse the existing Git adapter as the Host execution seam

Add a cohesive `SynthesisGitSyncRuntimeBinding` containing the existing adapter, auto-sync/auto-retry flags, and sanitized config-status provider. Production composition builds it from prefs. The adapter continues to own token reads and Git execution; the application service receives no token or command runner.

### Make missing capabilities explicitly disabled

Both bindings remain optional in `SynthesisServiceOptions`, but omission selects pure disabled implementations with no Host fallback. Production legacy composition explicitly injects prefs-backed implementations. Readonly composition explicitly injects disabled implementations so tests lock the absence of prefs, credential, fetch, and subprocess access.

### Remove dead facade rather than port it

Delete the five Git and five WebDAV configuration/status/credential/test methods plus `onConfigurationChanged`. Preferences hooks already expose the supported configuration path and invalidate the default client. Retained runtime methods are two Git queries, five Git commands, one WebDAV query, and five WebDAV commands; `SynthesisClient.sync` is unchanged. The inventory becomes `115 methods / 1 direct consumer`.

### Preserve WebDAV protocol behavior in the Host adapter

The adapter maps configured-relative paths to the current remote root, preserves GET/PUT and `If-Match` behavior, and treats accepted MKCOL statuses exactly as today. `webDavSync.ts` continues to decide snapshot ordering, conflict promotion, durable import/export, and progress; it only stops constructing URLs or handling credentials.

## Risks / Trade-offs

- [Adapter/result drift changes sync behavior] -> Characterize current GET/PUT/MKCOL, missing HEAD, ETag conflict, and durable snapshot flows before migration.
- [A credential is accidentally cached] -> Test that changing the credential provider between two requests changes the Host HTTP request without rebuilding the port.
- [Malformed Host results leak raw details] -> Canonically rebuild every request/result and map throw/malformed/unavailable outcomes to stable diagnostics.
- [Hidden Git code becomes more permanent] -> Keep the binding minimal and explicitly leave Git retirement for a separate change.
- [Fixture churn hides regressions] -> Update active Core 144/159 fixtures to explicit fake bindings while retaining independent algorithm and persistence assertions.

## Migration Plan

1. Add failing contract, adapter, disabled-fallback, composition, and inventory tests.
2. Implement the WebDAV port/adapter and Git runtime binding factories.
3. Rewire sync services and compositions, then remove the dead facade/options/inventory entries.
4. Update current-state documentation and run focused plus production validation.
5. Rollback is code-only; no persisted data or remote migration is required.

## Open Questions

None.
