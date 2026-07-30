# Sidecar Runtime Supervision

## Launch and Identity

Plugin startup installs one verified native v2 bundle and launches only its
absolute executable:

```text
<executablePath> serve --config <absolute-config-path>
```

The command uses a sealed environment, an explicit working directory and no
shell, `PATH` lookup, Node runtime or JavaScript entrypoint. The launch config
uses `synthesis-sidecar-launch-config.v2` and binds one profile session to:

- profile, runtime-root and data-root hashes;
- bundle, Rust implementation, target/triple and build fingerprint;
- platform-signature evidence, service/protocol and repository schema version;
- supervisor instance, lease nonce, independent client/lifecycle tokens;
- `mutationEnabled: false` and loopback ephemeral port selection.

The normal supervised Rust service strictly rebuilds that config before
opening its isolated repository and canonical store. It then obtains the
profile owner, binds
`127.0.0.1:0`, atomically publishes
`synthesis-sidecar-discovery.v2`, and exposes:

```text
GET  /synthesis/v1/health
POST /synthesis/v1/call
```

Discovery, health and handshake carry the same implementation, bundle,
target/triple, build fingerprint and platform signature. Readiness also checks
profile, roots, schema, service/supervisor instance, exact capability order and
mutation-disabled state. Any mismatch fails closed; there is no local or Node
fallback.

The client token authorizes handshake, read and compute calls. The independent
lifecycle token authorizes shutdown and production activation. Neither token
appears in discovery, health, diagnostics or retained process tails.

The R9a reverse-Host endpoint is a distinct loopback-only listener with a
generation-scoped token. Its thirteen-operation registry maps directly to the
existing paged library/artifact/image, export, WebDAV, Related Items, Tag, and
staged-binding ports. It rejects unknown or extra authority, stale service
instances, expired calls, disconnected Host state, permission failures, and
conflicting effect replays before invoking a Host adapter.

## Profile Lifecycle

Lifecycle state is scoped by the profile hash:

```text
runtime/synthesis/service-runtime/profiles/<profileId>/
  owner/owner.json
  discovery.json
  sessions/<supervisorInstanceId>/
    config.json
    lease.json
  shadow-repository/<dataRootId>/
    identity.json
    synthesis.db
  shadow-canonical/<dataRootId>/
    identity.json
    transaction.json
    staging/
    backup/
    topics/<pathId>/current/**
```

The owner prevents a second service for the same profile. It protects only the
isolated sidecar process and is not the production database/canonical owner
lock. Discovery is removed only by its matching owner.

The normal `serve` route never opens production `synthesis.db`, production
Topic canonical files, Host capabilities, or Zotero APIs. Repository and
canonical identities must match the config before discovery is published.
Health and handshake use path-free O(1) snapshots.

R9a production startup runs the cutover in the background.
`preflight-production` opens only an explicit production copy, while
`serve-production` requires an explicit live-root admission, a matching
durable `preflight_verified` cutover receipt, and an exclusive owner file
beside `state/synthesis.db`. Both reject shadow paths and start with mutation
disabled. The production supervisor writes the private admission, accepts only
v3 discovery plus matching health/handshake authority, and keeps its connection
separate from the shadow supervisor.

The production activation command requires the current receipt, profile,
service and supervisor instance, capability fingerprint, exact 95-operation
ready roster, the versioned nine-check critical-smoke roster with per-check and
aggregate digests, and an evidence timestamp within one minute. Rust persists
that evidence in the activation record, fsyncs the production owner marker,
refreshes discovery, health, and handshake state, then opens its in-memory
mutation gate. The plugin confirms the refreshed health and handshake before
it persists the final `mutation_enabled` receipt. A durable native activation
without that final receipt enters Rust-only repair on restart; it never returns
to a legacy owner.

For a matching admitted receipt, restart skips backup and preflight but does
not reuse stale process evidence. The new owner reruns the public critical
smoke roster, replaces native activation evidence, and refreshes only the
receipt's service instance and monotonic update time. Receipt, owner, and
activation therefore identify the same live service. A changed durable basis
or fingerprint still enters Rust-only repair.

Default-client, Workflow, Workbench, Host Bridge, and MCP acquire the same
generation-scoped native composition only after this verified readiness. Before
then they return their bounded maintenance, unavailable, incompatible, or
repair-required result without constructing a legacy owner.

## Monitoring and Recovery

Process exit, stdin EOF and authenticated shutdown are the primary lifecycle
signals. The supervisor uses one recursive deadline scheduler:

- refresh the private lease every 30 seconds;
- check loopback health every 60 seconds;
- coalesce missed deadlines without replay;
- publish a snapshot only when externally visible state changes.

The Rust service checks the matching lease every 15 seconds and treats a lease
older than 120 seconds, wrong identity or unreadable lease as host loss. stdin
EOF is the immediate orphan signal. Both stop admission and enter the same
drain path.

Runtime ownership recovery first checks the recorded process. A live owner is
always a conflict. A dead owner may be atomically replaced only by the same
supervisor identity or after its lease is stale or invalid; stale discovery is
removed before the replacement publishes readiness. Production owner recovery
also requires the same profile, receipt, and capability identity.

Transient launch, process-exit and health failures restart after 1, 5 and 15
seconds. A fourth failure before five stable ready minutes fuses recovery.
Unsupported/corrupt runtimes, owner conflicts, private-file failures and
identity mismatches require manual recovery. stdout and stderr are continuously
drained into bounded tails and never drive per-chunk supervisor state.

## Read and Compute Surface

The public capability inventory remains fixed:

- `system.handshake`
- `system.shutdown`
- `workbench.chrome.read`
- `topics.canonical.inspect`
- Citation Graph layout, metrics, build and packed build-transfer compute

Workbench and canonical inspect read only isolated owners. The typed
Citation/Reference, Tag/Concept/Topic Graph and
Checkpoint/Bundle/WebDAV/Debug applications remain internal library
composition; they are not registered as new HTTP mutation capabilities and
cannot trigger downstream applications automatically.

The compute owner admits one active task and at most two queued tasks. Requests
and results use operation-specific strict DTO rebuilders and fixed byte/JSON
node limits. Deadline, cancellation, crash, invalid output and worker pipe EOF
fail the active task, replace the worker where safe, and never block health,
handshake or shutdown. Repeated worker faults fuse compute while leaving the
control plane available. O(1) snapshots are maintained incrementally.

The executable's internal `worker` mode has no database, canonical-file, Host,
Zotero or child-process authority. A service shutdown closes the worker pipe
and bounds process termination so an orphan worker cannot survive its owner.

## Drain and Reopen

All stop triggers share one ordered drain:

1. mark lifecycle stopping and stop new application/compute admission;
2. reject queued work and cancel active work;
3. await bounded handlers while keeping authenticated shutdown responsive;
4. terminate any unresponsive worker;
5. close canonical and repository owners;
6. close loopback, remove matching discovery and owner, then exit.

Cleanup phases are failure-isolated: one close error is recorded without
skipping the remaining owners. The plugin waits within its own shutdown budget,
then closes stdin and directly kills a service that does not exit. Reopen uses
the same identity-bound repository and canonical roots, recovers their journals
and cancels only interrupted running operations.

## Migration Boundary

R9a makes receipt-bound Rust activation the local production-owner and default
client route. The plugin retains only bounded reverse-Host adapters, and Node
is used only as a differential oracle in tests. The owner transition contains
no request-level fallback and never shares a live root.

R9b separately governs seven-platform and clean-machine acceptance. A passing
local smoke or candidate workflow does not publish assets, synchronize
prebuilds, or authorize release.
