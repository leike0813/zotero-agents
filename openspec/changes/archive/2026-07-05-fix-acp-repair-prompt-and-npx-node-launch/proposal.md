## Why

ACP Skills output repair currently repeats the full previous candidate JSON inside the repair prompt. On Windows npx ACP launches, this can corrupt the backend stdin NDJSON stream through the PowerShell npx wrapper, and it also wastes tokens because repair happens in the same session where the candidate is already in recent context.

## What Changes

- Remove the `Previous candidate` section from ACP Skills output repair prompts.
- Prefer direct `node.exe npx-cli.js` launch for Windows ACP backends whose command is `npx`.
- Keep existing npx launch behavior as fallback when node or the npm CLI entrypoint cannot be resolved.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: repair prompts no longer echo the previous candidate payload.
- `runtime-platform-services`: Windows npx ACP launches prefer a node-direct npm CLI path before PowerShell npx wrappers.

## Impact

- Affected code: ACP Skills output validation prompt builder, ACP transport launch planning, and Windows npx transport tests.
- No dependency changes.
- No workflow request or output schema contract changes.
