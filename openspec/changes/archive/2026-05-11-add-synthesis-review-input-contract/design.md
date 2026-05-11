# Design: Synthesis Review Input Contract

## Boundary

Synthesis Layer provides infrastructure inputs only. It does not write review
sections, choose narrative strategy, or infer new deep analysis graphs.

The review input package contains:

- topic synthesis Markdown;
- topic synthesis metadata;
- topic definition and resolver snapshot when available;
- resolved paper set snapshot;
- Paper Registry readiness rows for resolved papers;
- Unified Citation Graph slice for the resolved paper set;
- missing artifact diagnostics;
- topic timeline content from the topic synthesis artifact.

## DTO Shape

The DTO is JSON-safe and sorted deterministically. It uses portable paper refs
such as `libraryId:itemKey` and does not expose Zotero numeric item ids as the
primary contract.

## Graph Slice

The graph slice is a bounded projection for review input. It includes nodes and
edges directly related to resolved library papers. It does not introduce method
lineage, claim conflict, research gap, or topic timeline graphs.

## Read-Only MCP Tool

`synthesis.get_review_input` accepts a topic id and optional size/slice options.
The service returns the DTO. The MCP layer only routes to the synthesis service
and does not write Synthesis assets.

## Diagnostics

Missing digest, references, and citation analysis are reported as diagnostics
instead of blocking DTO construction. The review workflow can decide whether to
continue, ask the user to run missing artifact workflows, or stop.
