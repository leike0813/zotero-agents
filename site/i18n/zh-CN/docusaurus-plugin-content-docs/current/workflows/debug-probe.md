# Debug Probes

## Purpose

A debug toolkit primarily used for Workflow system development and diagnostics. This package contains multiple debug-only workflows covering `applyResult` contracts, Sequence Orchestration, interactive execution, and Host Bridge connectivity.

All debug workflows are marked `debug_only: true` and are only visible in debug mode.

## Included Debug Workflows

### Apply Contract Debug

Verify various combinations of `buildRequest` / `applyResult` hook invocations:

| Workflow | Description |
|---------|-------------|
| Debug: Apply Single Result | Single job + result fetch |
| Debug: Apply Single Bundle | Single job + bundle fetch |
| Debug: Apply Sequence Result | Multi-step sequence + result fetch |
| Debug: Apply Sequence Bundle | Multi-step sequence + bundle fetch |
| Debug: Apply Bundle Then Result | Combined call: bundle then result |
| Debug: Apply Result Then Bundle | Combined call: result then bundle |

### Sequence Debug

Verify the Sequence Orchestration multi-step coordination:

| Workflow | Description |
|---------|-------------|
| Debug Sequence Linear Probe | Verify serial execution and default handoff (pass_through) |
| Debug Sequence Workspace Reuse Probe | Verify cross-step workspace reuse (workspace: reuse-workflow) |
| Debug Sequence Context Isolation Probe | Verify selective handoff and isolated workspaces (workspace: new + handoff field mapping) |

### Interactive Debug

Verify interactive workflows that require user replies:

| Workflow | Description |
|---------|-------------|
| Debug: Interactive Choice Probe | Verify interactive choice flow |
| Debug: Interactive Then Result | Interactive execution then result fetch |

### Host Bridge Debug

| Workflow | Description |
|---------|-------------|
| Debug: Host Bridge Connectivity Probe | Verify Host Bridge connection path and permissions |

### General

| Workflow | Description |
|---------|-------------|
| Workflow Debug Probe | Inspect workflow pre-execution state, open diagnostics panel |

## When to Use

- Validate behavior after developing or modifying the Workflow system
- Troubleshoot abnormal Workflow execution
- Verify Sequence Orchestration handoff mechanisms
- Verify `applyResult` Hook contract compliance
- Verify Host Bridge connectivity and permission configuration

## Dependencies

- **Backend**: Skill-Runner service
- All marked `debug_only`; only visible in debug mode

## Next Steps

- [Debugging](custom/debugging) — debugging custom Workflows
- [Hook System](custom/hooks) — Hook API signatures and usage
