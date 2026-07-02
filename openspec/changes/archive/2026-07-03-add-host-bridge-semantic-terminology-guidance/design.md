# Design

## Shared Source

`skills_src/host-bridge-shared/terminology.md` is the single source of truth for Host Bridge semantic terminology. Render scripts copy it unchanged into:

- `skills_builtin/zotero-bridge-cli/references/terminology.md`
- `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/terminology.md`

The terminology reference is bilingual and current-state only. It uses a table with Chinese aliases, canonical terms, meaning, confusion boundaries, and recommended CLI entry points.

## Skill Routing

The wrapper skill and Zotero Librarian profile point agents to `references/terminology.md` when a task uses shorthand, artifact names, graph terms, run handles, notification terms, file handles, or writeback terms.

The terminology reference supplements generated CLI mappings. It does not duplicate full command docs and does not introduce compatibility or migration guidance.

## Governance

Doc/profile checks verify that generated terminology files match the shared source exactly and that terminology references are included in packaged skill/profile files. Current-state-only checks apply to both source and generated terminology.
