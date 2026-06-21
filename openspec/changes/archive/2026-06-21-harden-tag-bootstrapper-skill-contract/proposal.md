## Why

The tag-bootstrapper workflow adds a new path for creating the controlled tag vocabulary, so its skill contract needs to be explicit enough for interactive agents and stable enough for machine validation. The initial workflow wiring is in place, but the follow-up must harden the skill instructions, TagVocab reference routing, and output validation so generated tags do not pollute the formal vocabulary.

## What Changes

- Strengthen the built-in `tag-bootstrapper` skill instructions with purpose, interaction flow, TagVocab naming rules, output discipline, and LLM/script responsibility boundaries.
- Require the skill to use the copied `references/tag_standard.md` document before generating tags.
- Treat `add_tags` as object entries similar to `tag-regulator.suggest_tags`, with `tag` and `note` as the stable semantic payload and optional `facet` derived from the tag prefix.
- Add deterministic normalize and validate scripts for `tag-bootstrapper` output.
- Keep `assets/output.schema.json` structured-output friendly by using a wider schema for audit fields while preserving strict local validation in `scripts/validate_output.py`.
- Cover the skill contract and workflow hook behavior with focused tests.

## Capabilities

### New Capabilities

- `tag-bootstrapper-workflow`: Covers the interactive tag vocabulary bootstrap workflow, its built-in skill package contract, and direct controlled-vocabulary write boundary.

### Modified Capabilities

## Impact

- Affects `skills_builtin/tag-bootstrapper/**`.
- Affects `workflows_builtin/literature-workbench-package/tag-bootstrapper/**`.
- Affects built-in workflow/package manifest coverage.
- Adds focused workflow, hook, skill contract, and script validation tests.
