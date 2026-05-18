# Upgrade Topic Synthesis Skills

## Why

The new `create-topic-synthesis` and `update-topic-synthesis` skills currently
declare the right high-level workflow shape, but their packages are still too
thin for reliable execution by weaker agents. They also rely on a shared
runtime directory as a default internal resource, which makes the skill packages
non-portable and inconsistent with the local skill packaging convention.

## What Changes

- Make `create-topic-synthesis` and `update-topic-synthesis` self-contained
  skill packages with package-local runtime scripts, schemas, templates, and
  reference playbooks.
- Rewrite both `SKILL.md` files as minimum-executable instructions: input/output
  contracts, MCP dependencies, fail branches, package-local script calls,
  cwd/run-root confirmation, gate-only progression, SQLite-backed state, and
  final stdout constraints must be explicit in the skill body.
- Expand create workflow guidance for duplicate checking, topic definition,
  resolver generation, paper workset creation, per-paper analysis, section
  authoring, and cancellation/update handoff.
- Expand update workflow guidance for `synthesis.get_topic_context`,
  `recommended_update`, full vs. section patch selection, read-set hashes,
  replacement section constraints, and patch output.
- Update runner prompts so they point to package-local scripts/references and no
  longer mention the retired shared runtime directory.
- Rewrite package-local references in Chinese as optional example-driven
  expansions for workflow, paper analysis, and section writing. Runtime hard
  contracts live directly in `SKILL.md`; no runtime-contract reference document
  remains under `references/`.
- Upgrade the package-local runtime from generic stage prose to executable JIT
  guidance: gate responses include command examples and per-step reads/writes,
  stage runtime provides formal payload-file write actions, per-paper analysis
  is one row per gate loop, and render materializes final artifacts only from
  SQLite state.
- Add focused tests proving both skill packages are self-contained and their
  contracts document the required create/update behavior.

## Impact

- Affects `skills_builtin/create-topic-synthesis` and
  `skills_builtin/update-topic-synthesis`.
- Affects topic synthesis workflow contract and runtime package-shape tests.
- Does not change host-side synthesis artifact contracts, Workbench UI,
  persistence, sync/recovery, or review input behavior.
