# Design

## Backend Metadata

`BackendInstance.acp` is extended with:

- `connectionTest`: status, tested timestamp, config fingerprint, and optional error.
- `runtimeOptionsCache`: modes, raw models, current mode/model, display model options, reasoning options, and refreshed timestamp.

The config fingerprint is based on ACP launch-affecting fields: `command`, `args`, `env`, `acp.agentFamily`, and `acp.skillRoots`. When those fields no longer match the stored fingerprint, the backend is treated as `stale`.

## Probe Flow

`acpBackendProbe` starts a temporary ACP adapter with a temporary workspace/runtime directory and performs:

1. `initialize`
2. `newSession`
3. cache modes/models from the session response
4. close adapter

Success writes a passing test and cache. Failure writes a failed test and error. The same action powers both “connection test” and “refresh configuration cache”.

## Runtime Options

ACP provider exposes workflow runtime options only for `skillrunner.job.v1`:

- `acpModeId`
- `acpModelId`
- `acpReasoningEffort`

Enums are derived from the selected backend cache. Reasoning effort is derived by folding model variants with known suffixes such as `@high` or `-high`.

## Execution

ACP Skills execution checks selected ACP backend readiness before submitting. During runner execution, selected mode/model are frozen, applied after session creation and before prompt, and written to run store.

ACP Chat remains a direct debugging path and is not blocked by connection-test status.
