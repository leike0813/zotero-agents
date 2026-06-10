# Document Revise Canonicals Workbench

## Summary

Record the implemented Revise Canonicals workbench as an Index functional subview in Synthesis Workbench. The page lets users inspect effective canonical references, diagnose duplicates and stale residue, manage pending manual canonical merges, and edit safe external canonical metadata from the Canonical Details drawer.

## Motivation

Revise Canonicals was added after the Reference Matching manual-target and stale canonical lifecycle work. Its implemented behavior now spans UI state, canonical read model projection, guarded service commands, and readonly harness mocking. This follow-up change documents that behavior so the OpenSpec history matches the codebase.

## Proposed Behavior

- Add a `Revise Canonicals` entry beside `Advanced Matching` on the Index page.
- Switch Index into an on-demand workbench view without adding a top-level tab.
- Show effective canonical rows with search, filters, letter navigation, selection, detail drawer, and graph/binding/review/raw-reference summaries.
- Support single and batch pending merge workflows that apply through canonical revision merge requests.
- Support structured metadata edit for eligible unbound external canonicals, including incoming-redirect source comparison and copy-to-draft.
- Keep protected or Review-managed canonicals visible as diagnostics without making Revise Canonicals a second review queue.
- Keep UI harness readonly: merge/edit/archive/apply commands are mocked and do not write DB state.

## Non-Goals

- Do not introduce hard delete for canonical references.
- Do not replace Review Center Canonical Revision proposal review.
- Do not run matcher rebuilds from Revise Canonicals.
- Do not allow editing Zotero-bound canonical metadata, because Zotero remains the source of truth.
