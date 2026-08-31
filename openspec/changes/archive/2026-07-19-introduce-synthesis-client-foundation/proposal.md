## Why

Production consumers currently import the 126-method in-process Synthesis service or a narrow type derived from it, so the future remote service cannot replace the implementation without changing callers. A small environment-neutral contract package and the first real client consumer establish the dependency direction while production ownership remains unchanged.

## What Changes

- Introduce an npm workspace package for environment-neutral Synthesis contracts with stable errors, request scope, bounded page metadata, grouped client capabilities, and the workflow Topic option DTO.
- Add a migration-time in-process `SynthesisClient` adapter whose composition module is the only new code allowed to resolve the legacy default service.
- Migrate workflow parameter Topic options from a service-shaped dependency to `client.topics.listWorkflowOptions()` and keep dependency injection available for tests.
- Make the workflow Topic option DTO owned by the contracts package and re-export it from the legacy service during migration.
- Extend boundary checks so contracts cannot import Node/Zotero/DOM/plugin code and direct legacy service consumers cannot grow.
- Keep Workbench, workflow host, Host Bridge, MCP, hooks, and observer migration for follow-up changes; DB and canonical file ownership remain in-process.

## Capabilities

### New Capabilities

- `synthesis-client-contracts`: Defines the environment-neutral grouped client contract, stable error behavior, bounded request shapes, and migration-time in-process adapter boundary.

### Modified Capabilities

None. The workflow option result and current production behavior remain observable-compatible.

## Impact

- Root npm workspace and TypeScript build configuration.
- New `packages/synthesis-contracts` package.
- New plugin-side `src/modules/synthesisClient` composition and adapter modules.
- `src/modules/workflowParameterOptions.ts` and the legacy Synthesis service DTO export.
- Boundary, contract, workflow option, invariant, typecheck, and build verification.
