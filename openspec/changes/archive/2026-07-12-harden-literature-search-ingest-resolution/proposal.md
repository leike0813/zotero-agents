## Why

`literature-search-ingest` can currently move a candidate from a search result
to ingest with a title and loosely collected metadata. Agents sometimes skip
identifier and public-PDF retrieval, which weakens bibliographic accuracy and
loses useful access paths. Chinese literature needs source routing that reflects
its journal, thesis, and book metadata ecosystem.

## What Changes

- Require each workflow candidate to complete identifier, authoritative metadata,
  and legal public-PDF retrieval before it is shown for confirmation or ingested.
- Require disclosure of `identifier_not_found`, metadata provenance, landing URL,
  and PDF attempt outcome when identifiers or public PDFs cannot be obtained.
- Add Chinese-literature routing for China DOI, CNKI, Wanfang, PDC, publishers,
  institutions, and repositories by publication type.
- Preserve confirmed ingest of an identifier-free, PDF-free candidate only when
  authoritative metadata and the failed-attempt disclosure are available.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-package`: Strengthens Literature Search Ingest candidate
  resolution and public-PDF search behavior before interactive confirmation.

## Impact

- `literature-search-ingest` Skill instructions, runner prompt, README, and
  workflow behavior version.
- Focused workflow contract tests and OpenSpec coverage.
- No Host Bridge mutation API, result schema, UI parameter, or storage change.
