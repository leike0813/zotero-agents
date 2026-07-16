# Sidecar Runtime Supervision

Plugin startup now starts the verified product-owned Synthesis runtime
non-blockingly. The launcher executes only the absolute Node executable and
service entrypoint returned by the runtime installer. It does not inspect
system Node, PATH, npm, a login shell, or the ACP process-control registry.

The service is still mutation-disabled. It does not open production
`synthesis.db`, Topic canonical files, Host capabilities, workers, or domain
methods. The default production `SynthesisClient` remains the in-process
composition.

## Profile Lifecycle

Lifecycle state is scoped by a hash of the Zotero profile directory:

```text
runtime/synthesis/service-runtime/profiles/<profileId>/
  owner/owner.json
  discovery.json
  sessions/<supervisorInstanceId>/
    config.json
    lease.json
```

The Node service obtains the runtime-instance owner before listening. A live
owner prevents a second service for the same profile. This lock protects only
sidecar process identity; it is not the production database or canonical-file
owner lock used by a future cutover.

The config contains launch-scoped secrets and is deleted by the service after
it obtains ownership. Discovery is written atomically after loopback listen and
contains only non-secret identity and endpoint fields. Readiness additionally
requires health and an authenticated protocol, bundle, schema, profile, root,
instance, capability, and mutation-mode handshake.

## Low-Interference Monitoring

Process events are primary:

- `proc.wait()` reports service exit;
- stdin EOF reports Zotero process death;
- authenticated shutdown handles controlled plugin exit.

The plugin uses one recursive deadline scheduler instead of permanent
intervals. In steady state it writes the private lease every 30 seconds and
checks loopback health every 60 seconds. Missed deadlines coalesce and do not
replay. Successful unchanged checks do not publish new supervisor snapshots or
read Workbench, operation, task, run, history, database, or domain state.

The service checks the fallback lease in its own Node event loop. Lease expiry
is 120 seconds, with a resume grace for long scheduling gaps. This fallback is
for addon-realm failure; host process death normally arrives immediately as
stdin EOF.

## Recovery and Shutdown

Transient launch, exit, or health failures restart after 1, 5, and 15 seconds.
A fourth failure before five stable ready minutes fuses automatic recovery.
Owner conflicts, unsupported or corrupt runtimes, private-file failures, and
identity incompatibility require explicit recovery.

stdout and stderr are continuously drained with bounded retained tails and do
not drive per-chunk state updates. Controlled shutdown cancels deadlines,
requests lifecycle-token shutdown, closes stdin, waits within the plugin
shutdown budget, and directly kills the service process if required.

The service is statically forbidden from creating descendants in this stage,
so direct process termination covers the complete process tree. The worker-pool
change must add service-owned worker drain and termination before enabling
workers.
