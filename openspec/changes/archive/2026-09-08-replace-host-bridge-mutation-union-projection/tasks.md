# Tasks

## OpenSpec and contracts

- [x] Record baseline `fc7384cc`, materialized surface metrics, and DEL-17 deletion inventory.
- [x] Update delta specs for Host Bridge service, CLI, literature ingest, output boundaries, operation receipts, and approval prompts.
- [x] Derive per-operation public schemas/results and remove public preview/execute union entries from the rendered capability contract.

## Tests first

- [x] Add failing Bridge registry/server tests for the 29 projection names, dry-run routing, operation-id mismatch, and removal of generic mutation capabilities.
- [x] Add failing MCP mirror/approval tests for independent tools, dryRun, and canonical observation.
- [x] Add failing Rust CLI parser/contract/client tests for semantic leaves, `--dry-run`, operation-id injection, schema mode, and rejection of preview/apply.

## Implementation

- [x] Implement registry projection handlers by reusing canonical mutation and attachment staging helpers.
- [x] Update Host Bridge server admission/approval/context handling so projected canonical calls bypass generic HTTP operation history.
- [x] Update MCP protocol projection and approval routing.
- [x] Update Rust CLI args, command contracts, command dispatch, and client operation-id handling.
- [x] Update governed Skill/catalog sources and regenerate materialized surfaces.

## Verification

- [x] Run focused TypeScript tests, Rust tests, type checks, OpenSpec validation, and Host Bridge content/surface checks.
- [x] Complete the governed semantic review/review mirror (delegated; translation intentionally not performed in this turn).
- [x] Run the full existing Broker mutation authority suite and attachment locality tests.
- [x] Run OpenSpec verify-change and mark all tasks complete; leave the change unarchived and do not commit or publish.

