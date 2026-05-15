# Change: Add Literature Digest Auto Reference Matching

## Why

`literature-digest` creates a references note that is usually the immediate
input for `reference-matching`. Requiring users to run the second workflow
manually makes the common path slower and leaves new references notes without
citekeys unless the user remembers the follow-up step.

## What Changes

- Add a default-enabled `auto_reference_matching` option to `literature-digest`.
- After digest apply writes the references note, run reference matching on that
  note locally using the current reference-matching default parameters.
- Do not run the reference-matching freshness gate for this post-processing
  step, because the references note has just been produced by digest apply.
- Keep digest apply successful if auto matching fails, returning a warning in
  the apply result.

## Impact

- Specs: literature workbench package workflow behavior
- Code: literature-digest workflow manifest/apply hook and reference matching
  reuse helper
- Tests: literature-digest workflow tests and reference-matching regression
