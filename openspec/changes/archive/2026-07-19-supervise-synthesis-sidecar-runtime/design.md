## Context

The repository has a mutation-disabled Node service control plane and a
five-platform product-owned Node runtime installer. Plugin startup does not yet
launch the runtime. The next topology must not introduce an unmanaged process,
must not consult system Node or PATH, and must not impose high-frequency
background work on Zotero's single-threaded event loop.

The sidecar remains isolated from production Synthesis data in this change.
The process owner lock therefore protects one runtime instance per Zotero
profile; it is not the later production database/canonical-file owner lock.

## Goals / Non-Goals

**Goals:**

- Launch the verified runtime non-blockingly from plugin startup.
- Share strict lifecycle DTOs between plugin and service.
- Prevent concurrent profile-scoped service instances and orphan processes.
- Separate discovery, liveness, readiness, compatibility, and recovery state.
- Keep steady-state Zotero wakeups and IO bounded and low frequency.
- Provide bounded shutdown, restart, crash-loop fuse, and explicit recovery.

**Non-Goals:**

- Route the production `SynthesisClient` to the service.
- Open production SQLite or canonical files from the service.
- Add workers, domain capabilities, SSE, UI, preferences, or durable fuse state.
- Automatically roll back the active runtime pointer.

## Decisions

### 1. One strict lifecycle contract owns all cross-process files

`packages/synthesis-contracts` defines config, owner, lease, and discovery
schemas. Unknown fields, unsafe IDs, non-loopback endpoints, identity mismatch,
and absolute paths outside the single managed profile root fail closed.

The profile scope ID is the SHA-256 of the normalized Zotero `ProfD` path.
The lifecycle tree is:

```text
service-runtime/profiles/<profileScopeId>/
  owner/owner.json
  discovery.json
  sessions/<supervisorInstanceId>/
    config.json
    lease.json
```

Alternative: duplicate plugin and service interfaces. Rejected because
lifecycle identity and cleanup rules need one cross-process source of truth.

### 2. The service owns runtime-instance exclusion

Before listen, the service atomically creates the owner directory and record.
A live recorded PID always rejects a second owner. A dead PID from the same
supervisor can be reclaimed immediately for bounded restart; a different
supervisor requires both a dead PID and expired or missing lease. Reclamation
renames the old owner directory before competing for a new one.

All discovery and owner cleanup re-read and compare supervisor/service
identity. The lock does not authorize production data writes.

Alternative: plugin-only lock files. Rejected because concurrent launchers need
the launched process to arbitrate the final singleton race.

### 3. Process events are primary; one low-frequency scheduler is fallback

`proc.wait()` detects process exit. The plugin keeps child stdin open; service
stdin EOF detects Zotero process death without a heartbeat. One recursive
one-shot timeout schedules all plugin-side lease, health, stable-window, and
restart deadlines.

There are no permanent `setInterval` loops. Missed deadlines coalesce instead
of replaying historical ticks, and a task cannot overlap another invocation of
the same task.

Steady-state defaults:

- lease write every 30 seconds;
- service-side lease check every 15 seconds;
- lease expiry after 120 seconds;
- health request every 60 seconds;
- three consecutive health failures before restart;
- one 30-second resume grace after a scheduling gap longer than lease expiry.

Alternative: second-level lease and health polling. Rejected because the
mutation-disabled sidecar does not justify a permanent high-frequency tax on
the Zotero event loop.

### 4. Launch uses only the verified product runtime

The launcher executes the installer's absolute Node path with the absolute
entrypoint and config path. `environmentAppend` is false. PATH, NODE_OPTIONS,
NODE_PATH, npm, and shell variables are omitted; only a small OS-required
allowlist is copied. Workdir is the managed session directory.

The launcher does not use command discovery or the ACP process-control layer.
The current service statically forbids workers and child processes, so direct
process-handle termination covers the complete process tree for this slice.

### 5. Discovery and handshake form separate gates

The service atomically writes discovery only after binding loopback. The plugin
then performs unauthenticated health and authenticated handshake with bounded
deadlines. It verifies protocol, service, schema, bundle, profile, roots,
supervisor/service instances, capabilities, and literal
`mutationEnabled: false`.

Discovery never contains tokens, config paths, raw profile paths, or data paths.
The config is deleted after successful read and owner acquisition; failure to
delete it aborts startup.

### 6. Recovery is bounded and classification-driven

Unexpected launch/process/health failures restart after 1, 5, and 15 seconds.
A fourth failure enters manual-recovery-required state. Five continuous ready
minutes clear the failure history.

Owner conflict, unsupported/corrupt runtime, private-file permission failure,
and identity/protocol/schema/capability mismatch are terminal until explicit
recovery. Recovery creates a new supervisor session and revalidates runtime.
Runtime pointer rollback remains explicit.

### 7. Logs are drained without becoming a state invalidation source

stdout and stderr begin concurrent blocking reads immediately after launch.
EOF ends each reader. Lifecycle JSONL is parsed with size and field limits;
non-structured tails are capped at 64 KiB each. Bursts are processed in bounded
batches with event-loop yielding. Successful heartbeat, health, and ordinary
log chunks do not publish snapshots.

### 8. Shutdown fits the existing plugin lifecycle budget

Stopping cancels the deadline scheduler and restart state, sends authenticated
shutdown, closes stdin, and waits within the existing three-second hook budget.
If the service remains alive, the supervisor calls the direct process handle's
kill method and performs identity-scoped session/discovery cleanup.

## Risks / Trade-offs

- [Addon-realm failure can take up to two minutes to expire] → stdin EOF handles
  process death immediately; the file lease is only a fallback, and the service
  cannot mutate production state in this change.
- [PID reuse can make a stale owner look live] → Fail closed rather than risk
  overlapping owners; explicit recovery or process termination resolves it.
- [System suspend can make a valid lease appear stale] → Use a one-time resume
  grace and treat stdin liveness as the stronger signal.
- [Mozilla Subprocess stream APIs vary by Zotero version] → Keep the wrapper
  structurally typed and test EOF, missing methods, and bounded kill behavior.
- [Direct kill will not cover future workers] → Keep descendants forbidden
  until the worker-pool change adds service-owned worker drain and termination.

## Migration Plan

1. Add lifecycle contracts and service lifecycle tests.
2. Extend installer identity and runtime persistence primitives.
3. Implement service owner, discovery, config deletion, stdin EOF, and lease
   expiry.
4. Implement control client and low-interference plugin supervisor.
5. Connect non-blocking startup and bounded shutdown.
6. Update guards, docs, and regression gates.

Rollback removes the supervisor and lifecycle files and restores the
packaged-but-not-launched topology. No production data migration is required.

## Open Questions

None.
