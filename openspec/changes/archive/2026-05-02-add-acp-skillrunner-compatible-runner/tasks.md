# Tasks

## 1. OpenSpec And Docs

- [x] Add change artifacts and delta spec.
- [x] Update plugin skill registry SSOT with ACP runner compatibility rules.

## 2. Contracts And Backend Metadata

- [x] Allow `skillrunner.job.v1` to dispatch to `acp` backends.
- [x] Add optional ACP backend metadata for `agentFamily` and `skillRoots`.
- [x] Keep ACP chat launch behavior unchanged.

## 3. Runner Foundation

- [x] Add agent family resolver and skill root planner.
- [x] Add ACP runtime dependency wrapper and uv probe.
- [x] Add workspace builder and skill materializer.
- [x] Add output validator and repair prompt builder.
- [x] Add ACP runner orchestrator and wire it into `AcpProvider`.

## 4. Tests

- [x] Cover agent family resolution and skill root planning.
- [x] Cover uv wrapping/probe behavior.
- [x] Cover provider contract dispatch for `skillrunner.job.v1` on ACP.
- [x] Cover workspace/materialization/output validation success and failure.
