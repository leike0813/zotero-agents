# Split Literature Deep Reading References And Appendix

## Why

The current `literature-deep-reading` skill treats the first References/Bibliography heading as the end of paper content. That rule keeps the bibliography out of bilingual reading, but it also drops valuable Appendix or Supplementary Material that appears after References in many papers.

This makes generated deep-reading HTML incomplete: appendices disappear from the reading flow, are not translated, and are not represented correctly in navigation.

## What Changes

- Change bootstrap parsing from a position-only `after_references` rule to section/block roles: `main`, `bibliography`, and `appendix`.
- Keep bibliography/reference-list blocks out of translation and bilingual compare flow.
- Keep Appendix/Supplementary Material blocks in the paper reading flow, including translation coverage and navigation.
- Restrict `references-seed-view.json` fallback extraction to bibliography blocks, so Appendix text is never consumed as raw references.
- Render final HTML in this order:
  - Preface
  - Main Paper
  - Summary
  - References
  - Appendix
  - Citation Graph
  - Extensions
- Preserve the existing agent-facing payload schemas; role assignment is a runtime view contract.

## Impact

- Modified capability: `literature-deep-reading-skill`
- Main implementation areas:
  - `skills_src/literature-deep-reading/scripts/deep_reading_runtime.py`
  - `skills_src/literature-deep-reading/renderer/templates/`
  - generated `skills_builtin/literature-deep-reading/`
  - focused literature deep-reading runtime tests
- Workflow source bundle construction is out of scope for this change.
