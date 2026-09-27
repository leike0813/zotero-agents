# Replace Host Bridge mutation union projection

## Why

Host Bridge and MCP currently expose a generic `mutation.preview`/`mutation.execute` union even though the Broker already owns 29 typed mutation operations. The union leaks internal dispatch shape into agent-facing contracts, weakens per-operation validation, and forces the CLI to compose a transport-level request before it can describe the business action.

## What Changes

- Replace the public mutation union with one capability and independent schema/result for each public `MutationOperation`.
- Add `--dry-run` to semantic CLI mutation commands and `dryRun` to MCP projections; both route through Broker preview without creating canonical effects.
- Preserve optional explicit `operationId` for execute retries, with adapter-side header/body consistency checks and generated ids when omitted.
- Remove public `mutation.preview` and `mutation.execute`; retain read-only `mutation.get_operation` and all Broker-private union types and lifecycle authority.
- Re-render governed CLI/MCP/Host Bridge surfaces and update tests, contracts, and instructions without changing Broker authority semantics.

## Capabilities

### Modified Capabilities

- `host-bridge-service`
- `host-bridge-cli-interface`
- `host-bridge-cli-literature-ingest`
- `host-bridge-output-boundaries`
- `host-bridge-operation-receipts`
- `host-bridge-approval-prompts`

## Impact

Implementation baseline: `fc7384cc`. The change affects Host Bridge capability schemas/registry/server, MCP mirroring, Rust CLI command and transport layers, governed semantic sources, generated contracts, and their public-boundary tests. It does not modify Broker mutation authority, generic HTTP operation storage for non-canonical capabilities, Pi runtime/catalog, or release workflows.
