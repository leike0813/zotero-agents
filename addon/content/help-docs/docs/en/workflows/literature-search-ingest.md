# Literature Search & Ingest

## Purpose

Search academic literature via AI and ingest the results directly into Zotero. Supports multiple search modes with interactive confirmation before executing the ingest operation.

## Use Cases

- Searching and batch-ingesting relevant literature when researching a new topic
- Entering the title, DOI, arXiv ID, or PMID of a known paper for quick import
- Expanding the search for related literature based on a seed paper

## Input Constraints

| Constraint Type | Description |
|---------|------|
| Input Unit | workflow (no items need to be selected) |
| Trigger Method | Run from context menu or Dashboard, no items need to be pre-selected |

## Search Modes

| Mode | Description |
|------|------|
| `auto` | Automatically determine the most suitable search mode (default) |
| `topic_expansion` | Search by research direction or topic to find related literature |
| `paper_seed_expansion` | Expand search based on a seed paper |
| `targeted_ingest` | Precisely locate and ingest a single paper |

## Execution Flow

```
1. Plan Confirmation Phase
   └── Read Zotero library and Synthesis context
       └── Automatically determine search mode (auto mode)
       └── Present the search plan to the user
       └── Wait for user confirmation

2. Search Phase (no ingestion)
   └── Search for candidate literature according to the confirmed plan
       └── Display search result list
       └── User selects literature to ingest

3. Ingest Phase
   └── Ingest papers one by one via zotero-bridge
       └── Includes metadata import and PDF attachment import
       └── Display ingest progress

4. Completion
   └── Output ingest result summary
       └── Includes successful/failed item information
```

### Interaction Details

- This workflow runs in **interactive** mode, requiring user confirmation at key points
- Plan confirmation: After the AI presents the search plan, the user confirms or adjusts it
- List confirmation: After search results are displayed, the user checks the items to ingest
- Execution progress can be monitored in the Dashboard

## Model Recommendation

🔴 **Must** have web search capability. The core of this workflow is searching academic literature online — models without web search capability cannot perform this task.
🟢 The model's reasoning capability doesn't need to be strong — search and ingest are essentially retrieval and tool-calling tasks, which lightweight models can handle.

## Outputs

- Search results are ingested directly as Zotero items
- Automatically attempts to download PDF attachments (best-effort)
- Can specify a target Collection for categorization

## Parameters

| Parameter | Type | Description | Default |
|------|------|------|--------|
| `query` | string | Search topic, research direction, paper title, DOI, arXiv ID, PMID, etc. | — |
| `searchMode` | string | Search mode | `auto` |
| `targetCollection` | string | Target Collection (optional) | Empty |

### searchMode Available Values

- `auto`: Automatically determine
- `topic_expansion`: Topic expansion
- `paper_seed_expansion`: Seed paper expansion
- `targeted_ingest`: Targeted ingest

## Dependencies

- **Backend**: ACP backend (requires ACP protocol support)
- **Skill**: The `literature-search-ingest` skill must be deployed on the backend

## Related Workflows

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Generate digests for ingested literature
