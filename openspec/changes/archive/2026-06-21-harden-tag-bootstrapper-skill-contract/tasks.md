## 1. Skill contract hardening

- [x] 1.1 Rewrite `tag-bootstrapper` skill instructions with purpose, interaction flow, tag rules, output contract, and LLM/script responsibility boundary.
- [x] 1.2 Route the skill to `references/tag_standard.md` before tag generation.
- [x] 1.3 Define `add_tags` as governed objects with required `tag` and `note`, similar to `tag-regulator.suggest_tags`.

## 2. Deterministic output tooling

- [x] 2.1 Add `scripts/normalize_output.py` for add-tag dedupe, facet inference, warning cleanup, and stable sorting.
- [x] 2.2 Add `scripts/validate_output.py` for strict local output validation.
- [x] 2.3 Adjust `assets/output.schema.json` to be structured-output friendly while leaving strict audit checks to the validator.
- [x] 2.4 Update `assets/runner.json` to call out the reference document and scripts.

## 3. Workflow and UI integration

- [x] 3.1 Add the built-in no-selection `tag-bootstrapper` workflow.
- [x] 3.2 Add build/apply hooks that read current vocabulary, pass protocol constraints, dedupe additions, and write through `saveTagVocabulary`.
- [x] 3.3 Add the `runTagBootstrapper` workbench host command.
- [x] 3.4 Show the bootstrap action only for a truly empty tags vocabulary.

## 4. Verification

- [x] 4.1 Add focused workflow tests for scan/loading, request build, apply dedupe, skill errors, and validation failures.
- [x] 4.2 Add contract tests for skill reference routing, output schema shape, runner prompt, and script availability.
- [x] 4.3 Run focused tag-bootstrapper tests.
- [x] 4.4 Run formatter checks and Python script compile checks for the touched skill files.
