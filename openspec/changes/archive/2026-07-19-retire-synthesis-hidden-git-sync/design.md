## Context

Synthesis currently has two durable-sync implementations. WebDAV is the only
visible transport, but a never-released Git runtime still owns canonical-write
autosync, retry scheduling, command/state APIs, encrypted token preferences,
composition bindings, Workbench projection fields, and a large documentation
surface. The durable bundle builder/importer is already transport-independent,
and WebDAV already exchanges those bundles through the semantic Host port.

The hard cut must preserve Zotero 7/9 plugin compatibility: runtime code cannot
depend on Node-only subprocess or filesystem APIs. Cleanup is limited to
plugin-managed runtime paths and preference keys. Existing WebDAV data,
credentials, remote layout, manual commands, conflict interaction, and durable
bundle schema remain valid.

## Goals / Non-Goals

**Goals:**

- Make WebDAV the only Synthesis durable-sync transport across contracts,
  runtime composition, UI, persistence allowlists, tests, and documentation.
- Reuse the existing durable bundle and WebDAV state machine instead of
  creating a second orchestration layer.
- Attach canonical-write autosync and bounded retry to WebDAV with explicit
  lifecycle cancellation and default-off configuration.
- Remove every Git-only implementation and public/internal surface, reducing
  the complete service inventory to `108 / 1`.
- Perform conservative, idempotent local cleanup without inspecting remote
  configuration or arbitrary user paths.

**Non-Goals:**

- Changing the durable bundle schema, WebDAV remote layout, database schema,
  credentials, manual sync commands, or conflict approval semantics.
- Migrating or deleting any remote Git repository or user-chosen filesystem
  path.
- Restoring scheduled retries across startup, starting a sidecar, removing the
  final full-service consumer, publishing, archiving, or committing the change.

## Decisions

### Use the WebDAV state machine as the single durable-sync runtime

Delete Git adapter/config/runtime modules and rename the remaining runtime
fallback around WebDAV semantics. `SynthesisClient.sync` exposes only
`webDav`; complete/legacy/readonly compositions inject only the semantic
WebDAV Host port. A generic multi-transport abstraction was rejected because
there is no second transport and it would preserve dead indirection.

### Trigger autosync after canonical write locks are released

Successful canonical service writes mark the current maintenance epoch dirty
only after the write lock has been released. The WebDAV description is read at
trigger time; autosync runs only when the strict `autoSyncEnabled` flag is true.
Notifications within one maintenance epoch share a five-second debounce and
produce one run. Projection, cache, job, and runtime-state writes remain outside
the trigger boundary. Autosync failures remain best-effort and never roll back
the committed canonical write.

### Keep retry state in-memory and owned by one trigger chain

Each explicit or autosync trigger creates one attempt chain with at most four
scheduled retries at `60s`, `5m`, `15m`, and `30m` when
`autoRetryEnabled` is true and the failure is retryable. Pause, disablement,
conflict, terminal failure, a new explicit trigger, or composition invalidation
cancels the pending timer. Startup reads persisted sync state for display but
does not re-arm old timers. Persisting scheduler ownership was rejected because
hidden retries must not outlive the service instance.

### Bind timer lifetime to production composition

The default composition owns an `AbortController` and passes its signal to the
service/runtime. Invalidation aborts the old instance before a replacement is
published, preventing stale debounce or retry callbacks from performing remote
I/O. Tests receive injectable debounce/retry delays; production defaults remain
fixed.

### Keep durable manifests readable by schema and hashes

New exports declare capability `webdav-sync.v1`. The importer continues to
validate schema ids/versions, paths, sizes, entry identities, and hashes; it does
not reject an otherwise valid existing manifest solely because it contains the
old capability string. Rewriting historical stored manifests was rejected
because the capability label is not an integrity boundary.

### Use fixed-scope startup cleanup

`syncRuntimeCleanup.ts` removes exactly `<runtimeRoot>/synthesis/git-sync`,
`<runtimeRoot>/synthesis/git-sync-worktree`, and the nine named
`synthesisGitSync*` preference values. The cleanup is idempotent, does not read
or parse the former remote URL, does not run Git, and never follows a configured
external path. Persistence integrity allows only `webdav-sync` afterward.

### Remove compatibility surfaces instead of deprecating them

Delete seven service methods, `sync.git`, Git DTOs/commands, preferences,
operation labels, i18n, tests, and help pages. Git Sync never shipped, so a
disabled shim would preserve security and maintenance cost without protecting a
supported client.

## Risks / Trade-offs

- [Canonical write notifications run before lock release] -> Keep the trigger
  call at existing post-commit/post-lock service boundaries and test ordering.
- [Old service callbacks perform remote I/O after invalidation] -> Abort owned
  timers before replacing the default composition and assert cancellation.
- [Retry chains multiply] -> Give each trigger one chain identity and cancel the
  previous scheduled callback before scheduling or starting a new chain.
- [Cleanup escapes plugin ownership] -> Construct only two fixed descendants of
  the supplied runtime root; never consume former remote/path preferences.
- [Manifest label change blocks existing payloads] -> Keep import validation
  transport-neutral and test old-label read plus new-label write.
- [Broad deletion leaves type-only or documentation references] -> Enforce
  repository searches, service-boundary tests, help build, TypeScript, and
  production build gates.

## Migration Plan

1. Add red tests for cleanup scope, WebDAV autosync/retry/cancellation, client
   shape, manifest labeling, inventory, and absence of Git projections.
2. Implement WebDAV runtime lifecycle and cleanup, then delete Git modules and
   remove service/composition/contract/preferences surfaces.
3. Update Workbench, readonly harnesses, persistence allowlists, specs, and
   current-state documentation; remove Git help pages and implementation tests.
4. Run focused Core tests, boundary/invariant suites, TypeScript, formatting,
   lint, help build, production build, and strict OpenSpec validation.
5. Rollback is code-only before release. The startup cleanup cannot restore
   never-released local Git runtime data, but it never affects WebDAV or remote
   repositories.

## Open Questions

None.
