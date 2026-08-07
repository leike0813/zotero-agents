# Proposal: Unify Agent Literature Bundle Exports

## Why

The manuscript-driven Research Bundle can drop papers that were already resolved by a selected Topic, while the user-facing Literature Bundle still only exports the current selection in the legacy v1 format. Agents need one navigable Research Product contract that can be exported from a selection, collection, or library and imported without losing source or embedded analysis payloads.

## What Changes

- Preserve every paper in the selected Topic `resolved_paper_set`, deduplicated by `paper_ref`, regardless of semantic score or ordinary related-paper limits.
- Add a root `index.md` to Research Products and all new Literature Product ZIPs.
- Make Literature Export selection-optional and add `selection`, `collection`, and `library` modes, with `selection` as the default.
- Keep `sourceOnly` as the existing flat, non-importable format while using the same resolved parent set.
- Emit non-source-only Literature exports as `research_bundle.product@2.0.0` ZIPs.
- Dispatch Literature Import by manifest kind/schema, retaining v1 import and adding Research Product import with integrity validation and per-paper failure isolation.

## Scope

The change is limited to built-in Research Bundle and Literature Workbench workflows, their shared materialization/import libraries, manifests, documentation, and regression tests. It does not change Zotero storage formats or backend APIs beyond existing bounded `library.listItems` and collection option surfaces.

