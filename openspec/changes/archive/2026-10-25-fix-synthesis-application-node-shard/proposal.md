# Proposal

## Why

The synthesis-application Node shard stalls when failed toolkit initialization leaves nested field hooks on shared mock prototypes. Restoring those prototypes exposes three existing failures: Windows timer-dependent scanning, outdated artifact manifest fixtures, and a boundary check that rejects the approved native reset recovery path.

## What Changes

- Restore shared mock prototype descriptors at reset, including removed, added, accessor, and symbol members.
- Add behavior regressions using real toolkit field hooks and prototype mutations.
- Give the large Index scan test a scoped, cancelable Node scheduler for zero-delay yields while preserving its dataset and assertions.
- Align MCP and Host Bridge manifest fixtures with the current grouped result contract.
- Distinguish repository ownership from canonical-store recovery in the existing native boundary checker.
- Record HB-08 evidence and verify the target shard and complete Node run.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-mock-parity-governance`: Require shared mock prototype isolation across resets.

## Impact

Changes affect Node test setup, existing Synthesis/Host Bridge tests, the service-boundary checker, and testing documentation. Plugin APIs, wire schemas, runtime scheduling, Rust reset behavior, and dependencies remain unchanged.
