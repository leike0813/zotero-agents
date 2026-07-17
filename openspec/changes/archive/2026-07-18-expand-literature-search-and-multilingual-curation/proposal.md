## Why

The literature search workflow currently verifies candidates too early, limiting source breadth and multilingual recall, while the ingest fallback can misclassify non-journal and non-English records. Metadata curation also needs stronger original-script and field-role protection so authoritative Chinese and other non-English metadata is not replaced by translations or written into incompatible Zotero fields.

## What Changes

- Expand literature search into query and source lanes that cover concept variants, multilingual queries, seed citations, local-collection gaps, discipline sources, repositories, grey literature, and Chinese/Taiwan sources.
- Separate broad candidate discovery from ingest eligibility so incomplete but traceable records can be retained and explicitly marked for later curation.
- Add an end-of-run lifecycle for `status:need-metadata-curation`: insert it idempotently into the controlled vocabulary, then tag only successfully created or reused items that require curation.
- **BREAKING** Replace the flat `literature.ingest` paper payload with typed `itemType`, Zotero-compatible fields, structured creators, identifiers, and source URLs.
- Preserve authoritative original-script titles and creators during metadata curation; translations and romanizations become matching evidence rather than automatic replacements.
- Remove the curation tag only after metadata is successfully applied or authoritatively verified as requiring no changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-package`: broaden search planning, source routing, multilingual discovery, candidate tiers, late enrichment, and end-of-run curation tagging.
- `literature-workbench-workflows`: revise the search result contract and strengthen metadata-curator identity, language, field-role, and tag-cleanup behavior.
- `zotero-host-broker-capability-api`: replace the flat literature-ingest payload with a typed bibliographic item contract that preserves item type, field roles, and structured creator names.

## Impact

- Built-in literature search and metadata-search skills, their schemas, workflow hooks, and documentation.
- Zotero Host Broker, MCP/CLI literature-ingest inputs, and all in-repository callers.
- Synthesis controlled-vocabulary writes and workflow-level Zotero tag handlers.
- Existing search, Host capability, CLI/MCP, metadata-curator, and tag-vocabulary tests.
- No new dependency, provider API client, persistent search cache, or release action.
