# Fix Topic Graph Review Refresh and Visibility

## Why

Topic synthesis and topic graph review actions currently leave important
Workbench surfaces stale until the user refreshes manually. Topic graph relation
proposals are also split between the graph inspector and the Review page, so the
Review page does not act as a complete proposal and decision ledger. In the graph
view itself, relation edges are too faint to read reliably.

## What Changes

- Refresh Topics, Graph, and Review surfaces after topic synthesis workflow
  completion.
- Refresh Graph and Review surfaces after topic graph relation accept/reject
  actions.
- Show non-deleted topic graph relation edges and review items in the Review
  page Topic Graph tab, including both pending and decided records.
- Add a Topic Graph inspector action that opens the selected topic details.
- Increase Topic Graph relation edge visual weight and opacity.

## Impact

- UI-only change under the Synthesis Workbench.
- No topic synthesis skill, runtime, apply, or storage contract change.
- Existing topic graph service decision behavior is reused.
