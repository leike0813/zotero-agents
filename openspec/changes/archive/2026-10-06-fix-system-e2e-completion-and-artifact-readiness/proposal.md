# Proposal

## Why

Owner restart currently skips ordinary Phase 2 cases and the entry command returns the last process's verdict, hiding earlier failures. PA-02 also exposes a shared artifact-readiness failure when an oversized child note aborts otherwise valid Index neighbors.

## What Changes

- Derive selected stable case identities from real Mocha tests and preserve completion across runner-owned restarts.
- Require all selected cases and family evidence before successful completion; print an aggregate verdict and return a failing exit code for incomplete or failed runs.
- Isolate typed note resource limits in shared artifact readiness without changing direct note-read bounds.
- Update runner documentation and verify on the current Linux host with current-source sidecar.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `system-e2e-strategy`: selected-case completion and aggregate entry verdict across owner restart.
- `synthesis-host-artifact-read-port`: bounded note failures in exact artifact readiness.

## Impact

Existing runner/reporter, E2E declarations, Run Manifest collector, shared Zotero artifact readiness, their existing Node tests and developer documentation. No dependencies, public capability changes or CI promotion changes.
