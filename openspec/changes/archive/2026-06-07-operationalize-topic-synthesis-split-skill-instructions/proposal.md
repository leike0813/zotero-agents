## Why

The split topic synthesis packages now render richer single-file `SKILL.md`
instructions, but the instructions are still not operational enough for a real
agent run. They describe broad stage intent without clearly telling the agent
which gate command to run first, which returned fields to inspect, how to
obtain Host context, how to submit payloads, and when to rerun gate.

The old monolithic topic synthesis skills contain mature global product goals,
Host Bridge CLI guidance, and LLM/runtime responsibility boundaries. Those
parts are still valuable, but they must be converted to the split suite's new
gate/runtime contract instead of copied with old stage ids, action names, and
payload paths.

## What Changes

- Add an operational migration note focused on the remaining instruction gaps:
  stage command sequence, Host context acquisition, product goals, Host Bridge
  CLI usage, and LLM/runtime boundaries.
- Strengthen `stage-guidance.yaml` so Host reads are executable commands and
  runtime reads explain where the files come from.
- Add reusable `SKILL.md` fragments for product goals, `zotero-bridge` usage,
  LLM/runtime boundaries, and strict gate execution order.
- Update the renderer so each stage includes a concrete gate/run/submit
  sequence and context acquisition instructions.
- Regenerate all four split-skill packages while keeping each package's
  agent-facing surface as a single `SKILL.md`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `topic-synthesis-skills`: generated split-skill instructions become
  operationally executable without changing runtime behavior.

## Impact

- Affected areas: OpenSpec change artifacts, topic synthesis instruction
  migration artifact, `skills_src/topic-synthesis/` guidance/templates/renderer,
  four generated packages under `skills_builtin/`, and focused renderer tests.
- No dependency installation, workflow registration switch, runtime artifact
  shape change, Zotero writeback, or development server startup is required.
