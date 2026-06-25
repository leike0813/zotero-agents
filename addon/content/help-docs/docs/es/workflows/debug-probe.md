# Debug Probe

## Purpose

The debug probe package is primarily used for Workflow system development testing and problem diagnosis. It contains multiple debug-only workflows covering `applyResult` contract, Sequence Orchestration, interactive execution, and Host Bridge connectivity scenarios.

All debug workflows are marked with `debug_only: true` and are only visible in debug mode.

## Included Debug Workflows

### Apply Contract Debugging

Verify various invocation combinations of `buildRequest` / `applyResult` hooks:

| Workflow | Description |
|---------|------|
| Debug: Apply Single Result | Single job + result retrieval method |
| Debug: Apply Single Bundle | Single job + bundle retrieval method |
| Debug: Apply Sequence Result | Multi-step sequence + result retrieval |
| Debug: Apply Sequence Bundle | Multi-step sequence + bundle retrieval |
| Debug: Apply Bundle Then Result | Bundle followed by result combined invocation |
| Debug: Apply Result Then Bundle | Result followed by bundle combined invocation |

### Sequence Debugging

Verify the multi-step coordination mechanism of Sequence Orchestration:

| Workflow | Description |
|---------|------|
| Debug Sequence Linear Probe | Verify serial execution and default relay handoff (pass_through) |
| Debug Sequence Workspace Reuse Probe | Verify cross-step workspace reuse (workspace: reuse-workflow) |
| Debug Sequence Context Isolation Probe | Verify explicit relay filtering and isolated workspace (workspace: new + handoff selective mapping) |

### Interactive Debugging

Verify interactive workflows that require user replies:

| Workflow | Description |
|---------|------|
| Debug: Interactive Choice Probe | Verify the interactive choice flow |
| Debug: Interactive Then Result | Interactive execution followed by result retrieval |

### Host Bridge Debugging

| Workflow | Description |
|---------|------|
| Debug: Host Bridge Connectivity Probe | Verify Host Bridge connectivity and permissions |

### General

| Workflow | Description |
|---------|------|
| Workflow Debug Probe | Check Workflow pre-execution state and open the diagnostics panel |

## When to Use

- Verify behavior after developing or modifying the Workflow system
- Troubleshoot abnormal Workflow execution issues
- Verify the relay mechanism of Sequence Orchestration
- Verify whether the `applyResult` hook contract meets expectations
- Verify Host Bridge connectivity and permission configuration

## Dependencies

- **Backend**: Skill-Runner service
- All marked as `debug_only`, only appear in debug mode

## Next Steps

- [Debugging & Testing](#doc/workflows%2Fcustom%2Fdebugging) — Debugging methods for custom Workflows
- [Hook System](#doc/workflows%2Fcustom%2Fhooks) — Hook API signatures and usage
