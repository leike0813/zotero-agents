# Synthetic curation workflow fixtures

Wholly synthetic final-output payloads for the two curation workflows of the
offline `WF-01` happy-path family. Nothing here reproduces a real paper,
author, identifier, DOI, URL, path, hash, collection, Topic id, or research
result. Every value is invented for offline replay.

## Contents

- `collection-collector.json` — final output of the `collection-collector`
  skill (`kind: "collection_membership_selection"`).
- `literature-metadata-search.json` — final output of the
  `literature-metadata-search` skill (`kind: "literature_metadata_curation"`).
- `bindings.json` — the runtime substitution map for every identity token in
  the two payloads.

## Structure provenance

Both payloads mirror the **shape** of a reviewed successful production run and
nothing else:

| Source | What was taken | What was replaced |
| --- | --- | --- |
| `collection-collector` final output (step 37, Collection Collector) | The `kind`, the six counters, `selected_items[]` with its seven per-item fields, and the `diagnostics` array | Every title, score, reason, caveat, ref, count and scope string |
| `literature-metadata-search` final output (step 38, Metadata Curator) | The `kind`/`status`/`source` envelope, `metadata.{language,script,containers,creatorCompleteness,fields,creators}`, `evidence[]`, `warnings[]` and `error` | Every field value, creator, evidence entry, URL and identifier |

The authoritative field contracts are the production schemas
`skills_builtin/collection-collector/assets/output.schema.json` and
`skills_builtin/literature-metadata-search/assets/output.schema.json`; the
production consumers are
`workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs`
and
`workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs`.

The synthetic library background is
`tests/fixtures/workflow-happy-path/source/source.json` (20 parents, keys
`SYN00001`…`SYN00020`, 4 collections `SYNCOL01`…`SYNCOL04`). The titles used
here are the titles of that synthetic source, so the payloads stay referentially
consistent with the imported library.

These files are **peer responses**, not golden assertions. They describe what a
reviewed successful run returned; they do not define which metadata is correct,
how many papers belong in a collection, or what a curation must conclude.

## Runtime bindings

Nothing in these payloads may reach the production apply path unresolved.
`bindings.json` lists each identity token and its source key:

| Token | Where | Replace with |
| --- | --- | --- |
| `1:SYNCOLLECTION` | `collection` in `collection-collector.json` | `libraryId:key` of the imported target collection. The scope plan and the workflow parameter `collection` must carry the same value, because the collector apply hook rejects a mismatch. |
| `1:SYNPAPER01`…`1:SYNPAPER05` | `selected_items[].paper_ref` | `libraryId:key` of the imported parent items `SYN00008`, `SYN00011`, `SYN00014`, `SYN00019`, `SYN00020`. The library id must equal the id in the target collection ref. Refs must stay unique and must not repeat. |
| `__TOPIC_ID__` | `selected_items[].matched_topic_ids` | A synthetic Topic id that exists in the current run and is listed in the collector scope plan. Keep the same id in every entry. |
| selection | parent for `literature-metadata-search.json` | Select the imported `SYN00008` parent, so the curated fields describe the record that is actually on the shelf. The curator workflow takes exactly one parent. |

The synthetic parent carries no DOI, URL or `extra` identifier, so the curator
preflight resolves `identifier` to `null` and the search skill has to find the
identifier itself. That differs from the reviewed run, where the parent already
held a DOI. The payload therefore adds `DOI` and `url` as newly evidenced
fields — legal for the apply path, but worth knowing when reading the field
count. `accessDate` is a fixed synthetic timestamp, matching the other fixtures
in this family; it does not track the run clock.

The counts in `collection-collector.json` are internally consistent with the
synthetic library: `inventory_count` 20 equals the number of imported parents,
`existing_count` 5 equals the membership of `SYNCOL04`, and `selected_count`
equals `selected_items.length`. The counts are not a quality or coverage
expectation — an offline run that legitimately selects a different number of
synthetic items is still legal, and the counters must then be rewritten to
match that run rather than to these numbers.

## Not covered here

- The `collection_collector_canceled` branch of the collector schema. The
  reviewed evidence contains no successful cancellation, so no synthetic
  cancellation payload is provided.
- `metadata.itemType`, `originalTitle`, `alternateTitles` and non-empty
  `warnings`. The reviewed run emitted none of them, and inventing them would
  fabricate expected behaviour.
- Any statement about which titles, authors, identifiers or venues are
  bibliographically correct.
