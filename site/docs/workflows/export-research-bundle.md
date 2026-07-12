# Export Research Bundle

## Purpose

Auto-assemble a read-only Research Bundle in Dashboard Products from existing Zotero library and Synthesis context, based on a declared paper intent. The bundle collects relevant topics, core papers, and related papers with their available analysis artifacts.

## Inputs

| Parameter | Required | Description |
| --- | --- | --- |
| `paperTitle` | Yes | Working manuscript title used to find research materials. |
| `researchContent` | Yes | Research problem, methods, scope, and intended contribution. |
| `articleType` | No | Manuscript type (default: `original research`). |
| `maxTopics` | No | Maximum number of relevant topics to include, range 0–5 (default: 5). |
| `maxCorePapers` | No | Maximum number of core papers, range 1–20 (default: 20). |
| `maxRelatedPapers` | No | Maximum total related papers including core, range 1–80 (default: 80). |

No Zotero item selection is required.

## Behavior

1. Receive the paper intent parameters from the user.
2. Discover candidate materials from existing Synthesis Topics, Zotero library items, and available citation graph context.
3. Perform bounded evaluation to distinguish core papers from related papers.
4. Assemble the Research Bundle with topic reports, bibliographic metadata, and available v2 analysis artifacts (digests, references, citation analyses, conversation content).
5. For core papers, prefer Markdown source with local images; fall back to PDF; record a warning if neither is available.
6. Register the bundle as a read-only product in Dashboard Products.

Topic, graph, analysis artifact, or source unavailability degrades gracefully — the workflow continues with whatever evidence is still readable and records diagnostics and warnings. If no papers meet the criteria, the run ends without registering a product.

## Output And Apply

The Research Bundle is registered in Dashboard Products as a read-only artifact. Its structure:

| Path | Description |
|------|-------------|
| `README.md` | Agent- and human-facing entry point with suggested reading order, file naming, topic/paper index |
| `manifest.json` | Machine-readable inventory of v2 artifact paths, provenance, file integrity, and diagnostics |
| `topics/<topic-id>/report.md` | Topic synthesis report (when available) |
| `papers/<paper-id>/metadata.json` | Portable bibliographic metadata per paper |
| `papers/<paper-id>/source.md` | Markdown source (when available) |
| `papers/<paper-id>/digest-*.md` | Literature Analysis digest artifacts (when available) |

Only `topics/` and `papers/` semantic directories are used alongside the root files. Markdown images are included only when their resolved local path falls within the Markdown file's directory tree; out-of-tree or missing images retain their original links but are not registered as product files.

## Estimated Duration

Depends on library size, candidate count, topic/graph availability, and backend response speed. Progress and results are visible in the run panel.

## Model Recommendation

A model with strong semantic understanding and tool-calling ability is recommended. The task requires judging topic and paper relevance against the paper intent and correctly using read-only Zotero and Synthesis context.

## Dependencies

- **Backend**: Skill-Runner
- **Skill**: `export-research-bundle`
- **Host Bridge**: Requires permission to read Zotero and Synthesis context

## Related Workflows

- [Literature Analysis](literature-analysis) — Generate digest and citation analysis artifacts that can be included in the bundle
- [Literature Search & Ingest](literature-search-ingest) — Search and ingest missing literature before assembling the bundle
- [Export/Import Literature Bundle](export-import-literature-bundle) — Export portable ZIP bundles of Zotero items (different purpose)
