# Change: Frontload Topic Synthesis Stage Validation

## Why

Topic synthesis runs can still reach `validate_final_artifacts` before shallow
or incomplete semantic sections are rejected. That makes long ACP runs hard to
repair because taxonomy, timeline, claims, gaps, external coverage, statistics,
and report errors are discovered only after final assembly.

## What Changes

- Move each content-depth validation to the stage where that content is first
  authored.
- Make Stage 7 the primary validator for taxonomy and timeline semantics.
- Make Stage 8 the primary validator for core analytical sections.
- Make Stage 9 read a payload, prevalidate final sections, and materialize
  `result/sections/*.json` only after validation succeeds.
- Keep Stage 10 as final artifact, registry, and host-parity validation.

## Impact

- Affects create/update topic synthesis skill packages, package-local runtime
  scripts, references, and contract tests.
- Does not change final artifact schema, host persistence format, Workbench UI,
  or canonical topic storage.
