## Context

Research Bundle materialization already resolves each selected `libraryId:itemKey` to a live Zotero item before creating portable metadata and paper assets. Zotero export translators are the canonical in-process boundary for BibTeX generation, and Better BibTeX registers its own export translator when installed. Workflow packages must not depend on another plugin's private global object or fixed local HTTP endpoint.

The bibliography is part of one atomic Product, so its item set, provenance, warnings, file integrity record, and failure behavior must remain aligned with the existing Product manifest.

## Goals / Non-Goals

**Goals:**

- Export one root `references.bib` for every successfully materialized core and related Zotero item.
- Prefer Better BibTeX while guaranteeing a Zotero BibTeX fallback for unavailable, failed, or empty primary output.
- Keep external-plugin integration behind a reusable Workflow Host API translator boundary.
- Preserve atomic Product registration and make bibliography provenance machine-readable.

**Non-Goals:**

- Recursively discover citations mentioned inside paper payloads or source text.
- Treat Zotero BibTeX output as semantically identical to Better BibTeX output.
- Create Better BibTeX auto-export jobs, export attachments, or call its JSON-RPC endpoint.
- Change candidate discovery, scoring, core classification, Product schema identity, or content package release state.

## Decisions

### Use Zotero export translators as the integration boundary

Workflow Host API v10 exposes an ordered `items.exportText()` operation. The host discovers candidates by translator ID and invokes `Zotero.Translate.Export` with the caller's item set and bounded boolean display options. Results include the actual translator and an ordered attempt record.

This capability-based boundary is preferred over detecting the Better BibTeX add-on ID, reading a private `Zotero.BetterBibTeX` global, or calling the plugin's localhost JSON-RPC service. It works with the translator Zotero actually registered and keeps plugin-specific transport knowledge out of workflow code.

### Keep fallback order explicit and generic

The Research Bundle supplies two candidates in order: Better BibTeX, then Zotero BibTeX. Unavailable translators, lookup failures, translation exceptions, and whitespace-only output advance to the next candidate. The host returns a discriminated success/failure result rather than forcing workflow code to parse exception text.

### Export the materialized paper set once

`materializeResearchProduct()` collects the same live Zotero items that produce `paperManifest` entries and performs one bibliography export after the paper loop. Missing items are excluded from both sets. This avoids a second library query and prevents references for papers absent from the Product.

When no selected item materializes, the exporter is not called and the manifest records `not_generated/no_materialized_items`. When at least one item materializes and every candidate fails, materialization throws before README measurement or Product registration.

### Keep bibliography state in the Product manifest

The manifest owns a top-level `bibliography` record with status, root path, requested and actual formats, translator identity, fallback flag, and input item count. Successful fallback also appends one stable `bibliography_export_fallback` warning, allowing existing apply diagnostics to summarize it without introducing a second warning source.

`references.bib` is added through the existing inline-text archive entry path, so file size and SHA-256 integrity are measured by the same archive API as other Product assets.

## Risks / Trade-offs

- **Native fallback can produce different citation keys or fields** → Record `actual_format`, translator identity, and fallback diagnostics; never label fallback output as Better BibTeX.
- **Translator APIs can fail because of plugin or item data problems** → Normalize attempts, try the ordered fallback, and reject atomically if no non-empty output exists.
- **Host API version changes can invalidate package runtime negotiation** → Advance the host version and the literature-workbench package maximum together, with loader and debug-probe contract tests.
- **A selected item can disappear before apply** → Export only successfully resolved items; retain existing `paper_missing` diagnostics and skip bibliography export when none remain.

## Migration Plan

- Ship Workflow Host API v10 and the updated literature-workbench package together.
- Existing Product records remain unchanged; only newly materialized Research Bundles receive the bibliography record and file.
- Rollback removes the v10 method and bundle invocation together; no Zotero library data migration is required.

## Open Questions

None.
