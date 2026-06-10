# Design

## Context Sources

The split runtime SHALL render context views only from data it already owns:

- `paper_workset` rows populated by resolver cascade.
- `paper_triage` rows submitted through Stage 30 gate validation.
- `runtime/payloads/paper-artifacts-manifest-batch-1.json`.
- `runtime/payloads/citation-graph-metrics-batch-1.json`.

The agent never writes context views directly.

## Rendering Model

The runtime renders two separate Markdown views:

- `cross-paper-context.md` is for core synthesis. It includes context selection,
  graph metrics summary, paper metadata, paper triage, and filtered digest
  excerpts for selected core papers.
- `external-literature-context.md` is for finalize. It includes external-heavy
  hints, compact reference rows, and citation analysis reports for selected
  external-context papers.

The two views intentionally stay separate so core synthesis does not use
external references as primary evidence for taxonomy, claims, or timeline.

## Selection

Selection is deterministic. It scores papers by topic relevance, quality,
artifact availability, and graph role/scores. It uses the existing calibrated
constants from the topic synthesis payload simplification work: core analysis
p90, external literature p75, and safety margin 0.10.

## Minimal Contract

The manifest records paths, selection constants, selected refs, and per-paper
artifact availability. It does not record hashes, receipts, audit state, or
apply-blocking diagnostics.

## Non-Goals

- No legacy `stage_6_cross_paper_map` action.
- No `derive_cross_paper_evidence_map` restoration.
- No artifact registry or hash validation restoration.
- No extra web/network literature lookup.
