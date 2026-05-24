# Change: Redesign Topic Synthesis Skills v2

## Why

`create-topic-synthesis` and `update-topic-synthesis` have accumulated too many
incremental prompt/runtime edits. The current skill instructions are hard to
follow, while the content contract and schemas have become stricter. Agents need
a clean, gate-driven package that mirrors the proven `literature-digest`
structure.

## What Changes

- Rewrite both topic synthesis `SKILL.md` files using the `literature-digest`
  chapter structure.
- Treat SQLite as runtime state/receipt/hash registry only; structured JSON
  files in the run workspace are the content source of truth.
- Reframe the runtime stages as v2 stages from runtime setup through final
  validation.
- Make gate output include complete JIT fields: `core_instruction`,
  `instruction_refs`, `schema_refs`, command example, reads/writes, and
  progress.
- Reorganize package-local references into per-stage documents.
- Validate stage artifacts against schemas before allowing stage completion.

## Impact

- Affects only the two built-in topic synthesis skill packages and their
  contracts/tests.
- Does not change Workbench UI, host-side canonical persistence, Zotero sync,
  or topic detail rendering.
