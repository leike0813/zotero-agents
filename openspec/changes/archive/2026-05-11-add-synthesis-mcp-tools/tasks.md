# Tasks

## 1. OpenSpec Contracts

- [x] Add proposal, design, tasks, and delta specs for Synthesis MCP tools.
- [x] Validate the change status with OpenSpec.

## 2. MCP Tests

- [x] Add tests that Synthesis tools appear in `tools/list`.
- [x] Add tests for `synthesis.get_schemas`.
- [x] Add tests for resolver validation and execution routing.
- [x] Add tests for Paper Registry and Citation Graph read routing.
- [x] Add tests for artifact manifest and batched artifact read routing.
- [x] Add tests that unknown Synthesis tool args are rejected.

## 3. MCP Implementation

- [x] Add Synthesis MCP service DTO contract.
- [x] Add `resolveSynthesisService` option to the MCP handler.
- [x] Register read-only Synthesis tools in the existing MCP registry.
- [x] Implement tool summaries and structured content.
- [x] Preserve no-write policy for Synthesis MCP tools.

## 4. Verification

- [x] Run targeted core MCP tests for Synthesis tools.
- [x] Run `npx tsc --noEmit`.
