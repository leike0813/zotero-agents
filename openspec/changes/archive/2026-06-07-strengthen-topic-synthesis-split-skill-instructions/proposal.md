## Why

The generated topic synthesis split-skill packages now have a real
gate-directed runtime path, but their `SKILL.md` files still read like a
minimal skeleton. Each stage lists a task, required reads, schema path, and a
payload example, but it does not explain how to use the context, what each
payload field means, or which quality bar the authored JSON must meet.

The existing monolithic `create-topic-synthesis` and `update-topic-synthesis`
packages contain useful execution discipline and semantic writing standards,
but they also contain obsolete stage numbers, action names, payload wrappers,
paths, and context boundaries. Those instructions must be digested and
converted into the new split-skill contract rather than copied.

## What Changes

- Add a migration analysis artifact that records which old instruction
  content is reusable, which content requires conversion, and which content
  must not be migrated.
- Add `skills_src/topic-synthesis/contracts/stage-guidance.yaml` as the
  development-time source of truth for stage guidance.
- Update the topic synthesis renderer so each generated package keeps a
  single agent-facing `SKILL.md` and embeds stage execution steps, field
  guidance, semantic writing standards, quality checks, common pitfalls, and
  schema-valid inline examples.
- Regenerate the four split-skill packages from the source tree.
- Keep generated packages self-contained and keep the existing monolithic
  `create-topic-synthesis` and `update-topic-synthesis` workflows unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `topic-synthesis-skills`: generated split-skill instructions become
  materially more actionable while preserving the single-`SKILL.md` package
  surface and the current runtime contract.

## Impact

- Affected areas: OpenSpec change artifacts, topic synthesis instruction
  migration artifact, `skills_src/topic-synthesis/` contracts and renderer,
  four generated packages under `skills_builtin/`, and focused renderer
  tests.
- No dependency installation, development server, workflow switch, Zotero
  writeback, or DETR playbook generation is required.
