## 1. OpenSpec Contract

- [x] Create proposal/design/tasks for `bootstrap-literature-deep-reading-skill-runtime`.
- [x] Add a `literature-deep-reading-skill` delta spec for first-phase built-in skill bootstrap behavior.

## 2. Skill Source

- [x] Add `skills_src/literature-deep-reading/` as the source of truth.
- [x] Add `SKILL.md`, runner manifest, input/parameter/output schemas, and runtime CLI source.
- [x] Keep the agent-facing runtime as a single script: `scripts/deep_reading_runtime.py`.

## 3. Renderer and Generated Package

- [x] Add deterministic TypeScript renderer.
- [x] Generate `skills_builtin/literature-deep-reading/`.
- [x] Ensure generated package is self-contained and does not import `skills_src/`.

## 4. Verification

- [x] Add focused renderer/package/runtime tests.
- [x] Run focused literature deep reading bootstrap test.
- [x] Run OpenSpec strict validation.
- [x] Run TypeScript no-emit check or targeted equivalent if full check is blocked by unrelated repository state.
