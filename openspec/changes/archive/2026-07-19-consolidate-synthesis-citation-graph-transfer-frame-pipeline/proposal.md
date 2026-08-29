## Why

Citation Graph Build transfer currently exposes a canonical page-frame worker path alongside owner DTO helpers and a second output-staging protocol used only by tests. These parallel paths obscure the real service/worker boundary and allow critical retry, rollback, and tamper coverage to bypass the production attempt lifecycle.

## What Changes

- Make one canonical page-frame carrier the shared service/worker transfer representation.
- Make the transfer execution owner the only strict worker-output validation and atomic staging boundary.
- Exercise retry, partial-output rollback, atomic commit, HTTP round-trip, and tamper behavior through the production attempt/frame lifecycle.
- Remove DTO-only attempt input/output helpers, the parallel begin/put/seal output protocol, and unused legacy result paginators.
- Clarify that worker page artifacts are produced only from engine-normalized Citation Graph Build results while preserving page ACK, hash verification, cancellation, timeout, and fuse behavior.
- Keep the HTTP transfer DTO and result, canonical bytes and hashes, 30-second active deadline, worker resource limits, production routing, and wire protocol unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-citation-graph-build-packed-worker-canary`: Requires the service and worker to use one canonical page-frame carrier and the owner to perform strict frame validation and atomic attempt staging without changing the external transfer contract.

## Impact

- Service implementation: Citation Graph transfer protocol, execution owner, pool, executor, worker, and large-transfer documentation.
- Tests: Core 201 moves all lifecycle cases to the production attempt/frame path; Core 195, Core 202, and Core 218 remain the governing ACK/resource/canonical checks.
- Public contracts: HTTP DTOs, result shapes, error codes, session state, canonical artifacts, and package fingerprints remain unchanged.
