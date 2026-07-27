## Why

Production activation is a cross-domain safety decision, not another capability adapter. It must run only after all seven operation-surface changes prove the complete 95-operation inventory and must separately verify owner identity, mutation admission, consumer routing, and crash recovery.

## What Changes

- Require all seven operation-surface changes and an exact 95-operation ready roster before activation.
- Complete lifecycle-token activation, durable owner/activation receipts, fsync ordering, mutation health confirmation, and Rust-only repair between activation and final receipt.
- Publish one native default composition to Workflow, Workbench, Host Bridge, and MCP only when identity, roster, owner, and mutation gates match.
- Run the full cross-language, boundary, integration, Rust, TypeScript, build, and OpenSpec verification set with zero production legacy construction.

## Capabilities

### New Capabilities

- `synthesis-native-production-activation`: Govern final native owner activation, mutation admission, default-client publication, consumer integration, and release-quality verification.

### Modified Capabilities

None.

## Impact

This change affects production owner composition, receipt and backup stores, runtime supervision, default-client lifecycle, consumer integration tests, boundary checks, and final documentation. It deletes no legacy source, performs no release, and does not include R9b or Gitee work.
