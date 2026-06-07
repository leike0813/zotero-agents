# Add Debug Sequence Probe Workflows

## Why

`skillrunner.sequence.v1` now supports ACP-only multi-skill workflows, but there
is no built-in debug workflow that exercises serial execution, workflow
workspace reuse, and handoff/context isolation through real workflow manifests.

## What Changes

- Convert `workflow-debug-probe` into a builtin workflow package that still
  includes the existing debug probe workflow.
- Add three debug-only sequence probe workflows under that package.
- Add debug-only builtin probe skills used by those workflows.
- Filter debug-only skills from the plugin skill registry and ACP shared skill
  catalog when debug mode is disabled.

## Impact

- Debug mode gains manual sequence diagnostics.
- Non-debug mode does not expose the new debug skills or workflows.
- Existing business workflows and skills remain unchanged.
