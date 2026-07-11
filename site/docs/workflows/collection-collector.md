# Collection Collector

## Purpose

Populate an existing Zotero collection with relevant literature that is already present in the same library. The workflow interprets a required free-text collection scope, reviews current metadata, tags, and Synthesis Topic membership, and applies a validated membership list.

## Inputs

| Parameter | Required | Description |
| --- | --- | --- |
| `collection` | Yes | Existing Zotero collection selected by path. |
| `collectionScope` | Yes | Meaning, research topic, or literature boundary represented by the collection. |

No Zotero item selection is required.

## Behavior

1. Page all top-level regular items in the target collection's library.
2. Exclude items already present in the target collection.
3. Build candidates from metadata/tag matches and relevant existing Synthesis Topics.
4. Semantically assess at most 250 candidates in batches of 20.
5. Select papers with relevance of at least `0.65` and retain the evidence and reason for each decision.
6. Recheck current membership and add the remaining items through workflow apply.

The workflow is automatic and does not pause for confirmation. It does not search the web, ingest new papers, edit tags, create collections, or mutate Synthesis Topics. Missing Topic context degrades to metadata and tag evidence.

## Output And Apply

The run result contains the selected Zotero item refs, titles, relevance values, evidence basis, matched Topic ids, reasons, caveats, and selection diagnostics. An empty selection is a successful no-op. Apply validates the target and item refs again and remains idempotent if membership changed while the skill was running.
