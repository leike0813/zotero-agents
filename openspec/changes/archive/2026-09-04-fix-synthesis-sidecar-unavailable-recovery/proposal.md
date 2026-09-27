## Why

Normal Workbench refresh activity can exceed the native sidecar's sixteen active HTTP-handler slots, causing an operation-independent `service_unavailable` response. If the sidecar later exits, cached production clients observe `service_not_ready` but do not engage the production owner's existing single-flight recovery path, leaving the Workbench unavailable until a manual retry.

## What Changes

- Preserve the sixteen-handler bound while applying listener-level backpressure instead of immediately rejecting the next loopback connection.
- Coalesce overlapping Workbench chrome refreshes into one in-flight read and at most one latest follow-up read.
- Transparently recover one supervised generation when a client operation has not yet sent an RPC and the ready connection was lost after an unexpected exit.
- Preserve a bounded safe failure reason on host RPC and client-operation trace terminals.
- Keep normal stop, disabled, incompatible, deterministic startup failure, and post-dispatch failure paths fail-closed and non-replaying.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-runtime-foundation`: Replace immediate overload rejection with bounded listener backpressure while retaining the sixteen-handler limit.
- `synthesis-sidecar-runtime-supervision`: Recover one unexpected post-ready loss through the production owner's shared single-flight generation.
- `synthesis-workbench-surface-refresh`: Coalesce overlapping chrome reads and preserve the latest requested refresh.
- `synthesis-sidecar-debug-observability`: Carry a bounded stable reason on failed host RPC and pre-dispatch operation trace events.

## Impact

- Native sidecar HTTP admission and its existing tests.
- Production-owner/default-client recovery composition.
- Synthesis Workbench chrome refresh scheduling.
- Additive `synthesis-sidecar-observation.v2` identity typing and debug tests.
- No dependency, workflow API, storage, discovery format, or schema-version change.
