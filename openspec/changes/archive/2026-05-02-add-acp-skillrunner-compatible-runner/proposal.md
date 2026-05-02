# Add ACP SkillRunner-Compatible Runner

## Summary

Add an ACP SkillRunner-compatible workflow runner that consumes the existing
`skillrunner.job.v1` contract and executes it through an ACP backend. The runner
keeps workflow authoring unchanged while providing run-local workspace
isolation, plugin-side skill materialization, agent-family-specific skill roots,
uv dependency injection for skill runtime dependencies, structured output
validation, and repair prompts.

## Motivation

The plugin already has a SkillRunner REST provider and an ACP chat provider, but
ACP backends cannot yet execute workflow skills. Existing workflows should not
need a new request kind or backend-specific manifest shape. The compatibility
layer should absorb ACP-vs-SkillRunner execution differences.

## Scope

- Support `backend.type="acp"` with `requestKind="skillrunner.job.v1"`.
- Keep `acp.prompt.v1` as the ACP chat path.
- Create isolated run workspaces and task sessions for workflow runs.
- Resolve ACP agent family and materialize skills into that agent's supported
  run-local skill roots.
- Wrap only workflow-run ACP launches with `uv run --with ...` when the skill
  declares `runtime.dependencies`.
- Validate `result/result.json` and issue bounded repair prompts when invalid.

## Out Of Scope

- Full SkillRunner REST/SSE/history/parser protocol.
- Interactive workflow mode and user reply loop.
- Global agent skill installation outside the run workspace.
- Changing `skillrunner.job.v1`, workflow manifests, or `applyResult()` hooks.

