# Change: Migrate Host Bridge Guidance To Wrapper Skill

## Why

Host Bridge capability guidance currently has two sources: generated CLI
documentation and ACP runtime prompt injection. That makes the prompt, README,
wrapper skill, and topic skill fragments drift independently.

The Host Bridge capability registry and CLI source should remain the surface
SSOT, while agent-facing guidance should be delivered through a normal built-in
skill package.

## What Changes

- Promote `zotero-bridge-cli` to a built-in plugin skill under
  `skills_builtin/`.
- Render full Host Bridge CLI reference material into the wrapper skill
  `references/` directory.
- Stop injecting Host Bridge command guidance into ACP prompts or engine
  instruction files.
- Keep runtime Host Bridge access materials: profile, token env, shims, and
  approval scope.
- Materialize the wrapper skill for ACP Chat backends that support project skill
  roots.

## Impact

This does not change Host Bridge HTTP, CLI output, MCP mirror names, profile
shape, approval routing, or file download rules. It only changes how agents
discover Host Bridge guidance.
