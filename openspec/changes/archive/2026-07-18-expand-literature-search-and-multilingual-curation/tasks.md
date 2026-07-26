## 1. Contract Tests

- [x] 1.1 Extend Search Ingest tests for multilingual/source lanes, candidate tiers, the single outcome ledger, and end-of-run controlled-tag application.
- [x] 1.2 Extend Host, MCP, and CLI tests for the typed literature-ingest payload, item-type field validation, and structured creators.
- [x] 1.3 Extend Metadata Curator tests for original-script protection, semantic field roles, identifier fallback, and curation-tag cleanup.

## 2. Typed Literature Ingest

- [x] 2.1 Replace the flat Host Broker literature-ingest paper input with typed item type, fields, creators, identifiers, and source URLs.
- [x] 2.2 Migrate MCP/CLI builders and in-repository callers to the typed payload and remove legacy normalization branches.

## 3. Search Ingest

- [x] 3.1 Implement core, multilingual, seed, gap, and source-lane guidance with broad discovery, early deduplication, one expansion round, and late enrichment.
- [x] 3.2 Replace the final parallel arrays with search summary, outcomes, and a run-scoped search-ledger artifact.
- [x] 3.3 Implement end-of-run controlled-vocabulary insertion and per-item `status:need-metadata-curation` tagging for eligible outcomes.

## 4. Metadata Curator

- [x] 4.1 Extend canonical metadata with original/alternate title roles, language/script, container roles, creator completeness, and multi-line identifier extraction.
- [x] 4.2 Protect original-script titles and creators in both identifier fast path and Agent fallback while allowing safe language-neutral updates.
- [x] 4.3 Remove the curation tag for applied or verified-no-change results and report tag-cleanup failures as partial outcomes.

## 5. Current-State Documentation

- [x] 5.1 Update Search Ingest and Metadata Search Skill/reference/workflow documentation without compatibility or history prose.
- [x] 5.2 Add `status:need-metadata-curation` to the Tag Bootstrapper tag-standard reference only.

## 6. Verification

- [x] 6.1 Run targeted Search, Host/MCP/CLI, Curator, handler, and tag-vocabulary tests and fix regressions.
- [x] 6.2 Run relevant typecheck/lint checks and validate the OpenSpec change.
