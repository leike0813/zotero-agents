## 1. Runtime Structure

- [x] 1.1 Replace position-only `after_references` handling with section/block `role` state in bootstrap parsing.
- [x] 1.2 Update reading block, source structure, and SQLite persistence outputs to carry `main` / `bibliography` / `appendix` roles.
- [x] 1.3 Restrict `references-seed-view.json` fallback extraction to bibliography blocks only.

## 2. Translation And Final Views

- [x] 2.1 Ensure Stage 30 requires translations for `main` and `appendix` blocks and rejects `bibliography` blocks.
- [x] 2.2 Split final rendered sections into `reading_blocks` and `appendix_reading_blocks` while preserving the existing translation payload shape.
- [x] 2.3 Update final navigation ordering to Main Paper, Summary, References, Appendix, Citation Graph, Extensions.

## 3. Renderer

- [x] 3.1 Add Appendix reading containers after structured References and reuse existing original / translated / compare / focus rendering.
- [x] 3.2 Extend TOC click and scroll tracking to include visible Appendix containers without reintroducing active-nav flicker.
- [x] 3.3 Regenerate `skills_builtin/literature-deep-reading` from the skill source.

## 4. Tests And Validation

- [x] 4.1 Extend focused fixtures with References followed by Appendix and appendix subsections.
- [x] 4.2 Add assertions for roles, translation coverage, references fallback exclusion, final order, and Appendix rendering.
- [x] 4.3 Run OpenSpec strict validation, focused mocha tests, Python compile checks, renderer JavaScript checks, TypeScript checks, targeted Prettier, and `git diff --check`.
