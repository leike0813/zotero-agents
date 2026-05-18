# Design

## Detail Shell

When `snapshot.selectedTab === "reader"` and `state.topicDetail` is present,
the app renders `renderTopicDetailShell(root, snapshot)` directly. This bypasses
the generic Workbench sidebar/topbar/content wrapper. Markdown reader remains in
the generic shell and is opened only by the Markdown export action.

The detail shell contains:

- narrow rail for Back/Home-level navigation;
- a single topbar with topic title, metadata badges, and actions;
- a main workspace with vertical tabs, reading surface, Evidence Explorer;
- a bottom horizontal timeline.

## Tabs

The structured detail tabs are:

- Overview: summary, positioning, review-oriented outline/read path.
- Taxonomy: taxonomy axis/rationale and nodes.
- Claims: claim cards with strength and evidence refs.
- Compare: comparison matrix and debates.
- External: external literature summary, themes, representative references,
  limitations.
- Coverage: coverage, gaps, diagnostics, source artifacts, evidence map
  provenance summary.

Missing structured data renders a compact empty state rather than raw JSON.

## Evidence

Evidence Explorer renders `paper_evidence` rows and highlights the selected row.
Claims, taxonomy nodes, comparison rows, and timeline events expose evidence
chips. Clicking evidence/timeline markers opens the existing digest modal through
`resolveTopicPaperDigest`.

Evidence map refs are shown as trace chips. The `evidence_map` section is
summarized as path/hash/candidate counts/candidate id count, not expanded as raw
internals.

## Styling

Topic Detail uses the existing `addon/content/synthesis/styles.css` with
`--topic-*` tokens matching `artifact/topic_synthesis_detail_design_tokens_20260516.md`.
The palette remains light and scanning-oriented: compact panels, 13px base text,
8px radius, resizable 360px Evidence Explorer, and 108px bottom timeline rail.
