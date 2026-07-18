## Why

The Synthesis Workbench still bypasses the established topics client for Topic Report export even though `SynthesisClient.topics.getTopicReport` already exposes the required bounded read. Migrating this final standalone report read removes another legacy service dependency from the Workbench without changing report semantics or expanding the client contract.

## What Changes

- Route Workbench Topic Report export through the existing topics client capability.
- Preserve topic validation, report title and Markdown handling, file-picker cancellation, newline normalization, file writes, and command single-flight behavior.
- Keep progress polling, commands, mutations, Host Bridge, MCP, service implementation, migration inventory, and process/storage ownership unchanged.

## Capabilities

### New Capabilities

- `synthesis-workbench-topic-report-client-consumer`: Defines Workbench consumption of the existing Topic Report client read while preserving export behavior and migration boundaries.

### Modified Capabilities

None.

## Impact

- Synthesis Workbench Topic Report export routing.
- Workbench and service-boundary regression tests.
- Current-state Synthesis layer documentation.
