## Why

The Topic Graph index engine source currently imports a sibling `.js` module that
does not exist in the TypeScript source tree, so the direct source Worker canary
fails with `ERR_MODULE_NOT_FOUND`. The source and compiled service surfaces need
an explicit parity contract before the next Synthesis self-review item proceeds.

## What Changes

- Make the Topic Graph index contract entrypoint resolve its sibling TypeScript
  module when executed directly from the source tree.
- Keep the service build responsible for rewriting relative TypeScript module
  extensions to native Node ESM `.js` references.
- Restore the direct source Worker canary and require it to match in-process
  engine results.
- Verify the compiled Worker and packaged service inventory remain unchanged.

## Capabilities

### New Capabilities

- `synthesis-worker-source-build-parity`: Defines source-worker resolution,
  compiled ESM extension rewriting, and direct/worker result parity.

### Modified Capabilities

None.

## Impact

- Affects the Topic Graph index engine contract entrypoint, its focused Worker
  fixture and Core tests, and Synthesis service build verification.
- Does not change public DTOs, algorithms, RPC, service inventory, persistence,
  dependencies, runtime/XPI assets, package exports, or Worker launchers.
