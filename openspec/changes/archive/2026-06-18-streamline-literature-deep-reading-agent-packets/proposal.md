# Streamline literature deep-reading agent packets

## Why

The `literature-deep-reading` skill already has a staged runtime with
`status` and `validate-*` commands, but the skill instructions only list those
commands. They do not make validation a stage gate, so an agent can continue
after an invalid payload instead of repairing the current stage.

The instructions also make later stages read many runtime views by default.
Most of those files are runtime-owned intermediate views or diagnostics. They
should remain available for traceability, but they should not be the default
stage handoff surface.

## What changes

- The runtime materializes small agent-facing packets for each handoff:
  `stage-10-agent-packet.json`, `stage-20-agent-packet.json`,
  `stage-30-translation-worklist.json`, and `stage-40-review-packet.json`.
- The packets summarize deterministic state, diagnostics, work items, and paths
  to larger trace views.
- `validate-*` commands require the corresponding packet after each completed
  stage.
- The generated `SKILL.md` and `runner.json` instructions become packet-first
  and explicitly require submit-then-validate stage gates.

## Non-goals

- Do not add, remove, or reorder stages.
- Do not change agent-authored payload schemas.
- Do not change final HTML rendering semantics.
- Do not change the workflow request, source bundle, or result apply contract.
