## 1. OpenSpec Contract

- [x] Create proposal/design/tasks for
  `bootstrap-topic-synthesis-skill-suite-renderer`.
- [x] Add a `topic-synthesis-skills` delta spec for the generated suite
  source/render contract.
- [x] Explicitly cite
  `artifact/topic-synthesis-multi-skill-contract-design.md`.

## 2. Suite Source

- [x] Add `skills_src/topic-synthesis/contracts/` shared path, stage, handoff,
  stdout envelope, DB schema, and payload schema assets.
- [x] Add reusable `SKILL.md` template fragments and four skill-specific
  templates.
- [x] Add package-local smoke runtime source under
  `runtime/topic_synthesis_runtime/`.

## 3. Renderer and Generated Packages

- [x] Add deterministic TypeScript renderer.
- [x] Generate four self-contained packages under `skills_builtin/`.
- [x] Keep existing `create-topic-synthesis` and `update-topic-synthesis`
  packages untouched.

## 4. Verification

- [x] Add focused renderer/package tests.
- [x] Ensure generated `SKILL.md` prose is Chinese while stable identifiers stay unchanged.
- [x] Run focused renderer test.
- [x] Run `npx tsc --noEmit`.
- [x] Run OpenSpec validation for this change.
- [x] Run targeted Prettier check for new files.
