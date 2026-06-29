## Why

Hermes ACP is implemented as a Python CLI installed in its own virtual environment, so wrapping the backend command with `uv run --isolated --with ... --` causes the Hermes console entrypoint to lose access to its own packages and fail before ACP initialization. Kilo also has an official npm package, but the current preset does not expose npm/npx launch metadata.

## What Changes

- Prevent Hermes ACP SkillRunner-compatible workflow launches from wrapping the backend process in `uv run --isolated`, while still detecting declared runtime dependencies and reporting that backend wrapping was intentionally bypassed.
- Keep non-Hermes ACP backends on the existing runtime dependency behavior: successful uv probes still wrap workflow launches when a skill declares `runtime.dependencies`.
- Add npm/npx metadata to the Kilo ACP preset using the official `@kilocode/cli` package.
- Update focused regression tests for Kilo preset metadata and Hermes runtime dependency wrapping behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: Hermes ACP workflow launches must keep the configured backend command unchanged even when runtime dependency injection would otherwise use uv wrapping.
- `backend-manager-ui`: The Kilo ACP preset must expose the official npm package as an npx launch option.

## Impact

- Affected code: ACP runtime dependency planning and ACP backend preset definitions.
- Affected tests: ACP SkillRunner-compatible runner regression tests and backend preset regression tests.
- Affected docs/specs: OpenSpec delta specs for ACP SkillRunner-compatible runner and Backend Manager ACP preset behavior.
- No dependency installation, Git history changes, or default Kilo launch behavior changes are required.
