# Literature Metadata Curator

## Purpose

Query, correct, and complete bibliographic metadata for a selected Zotero parent item. The workflow handles cases such as inconsistent title casing, missing authors, incomplete journal/volume/page fields, incomplete DOI/ISBN entries, and incorrectly set item types.

## Inputs

| Parameter | Required | Description |
| --- | --- | --- |

No user-configurable parameters. Select exactly one parent item in the Zotero item list. Attachments and multiple items are not accepted.

## Behavior

The workflow runs fully automatically without user confirmation. It follows two paths:

1. **Local fast path**: If the item has a DOI, ISBN, or a URL that deterministically resolves to a DOI, arXiv, or PubMed identifier, the workflow calls `runtime.hostApi.metadata.translateIdentifier` (a controlled read-only Zotero `Translate.Search` facade). When the candidate identifier matches and contains valuable bibliographic information, results are written back directly.
2. **Skill-Runner fallback**: If no reliable identifier exists, local search returns no results, the translator fails, the candidate is untrusted, or the identifier does not match, the workflow runs the `literature-metadata-search` skill for lightweight web-based metadata retrieval.

Both paths share the same canonical result format and apply handler.

### Write-back Rules

The workflow updates the parent item's bibliographic fields:

- Title, DOI, ISBN, ISSN, URL, abstract, date, language, library catalog
- Journal/conference/book/thesis/report fields (journal name, volume/issue/pages, publisher, conference name, school, report type, etc.)
- Creators (authors, institutional authors, etc.)
- `itemType` when supported by high-confidence evidence (e.g., journal article corrected to thesis)

The workflow does **not** modify attachments, notes, tags, collections, related items, PDF files, or web snapshots.

Without a stable identifier, the workflow only overwrites an existing title or changes the item type when: the candidate can be proven to be the same direct work, at least two independent bibliographic signals agree, and an authoritative landing page corroborates. Container titles are written to the appropriate container field rather than replacing the work title. Low-confidence, conflicting-candidate, or疑似-only results are skipped.

## Output And Apply

Metadata changes are applied directly to the selected Zotero parent item. No intermediate confirmation step is required.

## Model Recommendation

- **Fast path hit** (DOI/ISBN/supported URL identifier present): No backend model needed.
- **Fallback to `literature-metadata-search`**: A model with web search capability is recommended. The task is lightweight retrieval and evidence verification — it does not require long-form writing ability, but must distinguish homonyms, preprint vs. published versions, papers vs. theses, and different editions.

## Dependencies

- **Backend**: Skill-Runner (for fallback after local search miss)
- **Skill**: `literature-metadata-search`
- **Zotero Host API**: `metadata.translateIdentifier` (controlled read-only fast path)
- **Apply Handler**: `handlers.parent.updateMetadata`

## Related Workflows

- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — Search for new literature and ingest into Zotero
- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Generate digest and citation analysis from PDF/Markdown
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Normalize tags after metadata is complete
