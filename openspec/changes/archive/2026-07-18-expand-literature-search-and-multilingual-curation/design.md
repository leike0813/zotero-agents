## Context

Literature Search Ingest is an interactive SkillRunner workflow whose prompt currently combines discovery, verification, PDF probing, and mutation. This rejects useful multilingual and incomplete leads too early and performs expensive work before user selection. Its Host Broker fallback accepts a flat paper object and guesses `journalArticle` plus `publicationTitle`, which cannot faithfully represent books, chapters, conference papers, theses, reports, Chinese creators, or organizations.

Literature Metadata Curator already has a fast identifier path and a conservative Agent fallback, but the fast path can replace original-script titles and creators with translated or romanized metadata. Search-created items that need curation also lack a controlled lifecycle marker.

## Goals / Non-Goals

**Goals:**

- Maximize search-source coverage through explicit query/source lanes, multilingual expansion, seed chaining, local-corpus gap searches, early deduplication, and late enrichment.
- Preserve incomplete but traceable candidates and allow selected records to enter Zotero without inventing missing metadata.
- Replace literature-ingest guessing with an explicit typed bibliographic payload.
- Protect authoritative original-script titles, creators, and semantic field roles during curation.
- Add and remove `status:need-metadata-curation` through an auditable end-of-run lifecycle backed by the Synthesis controlled vocabulary.

**Non-Goals:**

- Direct provider API adapters, authentication bypasses, persistent search caches, automatic translation services, multi-hop citation graphs, or systematic-review orchestration.
- Writing translated or romanized metadata into Zotero primary fields.
- Editing the tag-regulator submodule.

## Decisions

### Search discovery and ingest eligibility are separate states

The Skill will plan `core`, `multilingual`, `seed`, and `gap` query lanes and route them across all applicable source categories. Discovery accepts traceable leads without requiring identifiers or complete metadata. Candidates are classified as `ready`, `needs_curation`, or `lead_only`; only the first two can be selected for ingest, and `needs_curation` requires an original title plus stable landing URL.

This increases recall without making uncertain metadata look authoritative. PDF probing and expensive enrichment run only after deduplication and user selection.

### A run-scoped search ledger records breadth and outcomes

The final contract uses `searchSummary`, `outcomes`, and an artifact `searchLedgerPath`. The ledger records query lanes, source attempts, unavailable sources, per-round unique yield, candidate clusters, and final item receipts. It is a run artifact, not a new database or Workflow Product.

### Literature ingest uses one typed payload

The flat paper object is replaced rather than maintained in parallel. The new DTO carries `itemType`, Zotero-compatible `fields`, structured `creators`, identifiers, and source URLs. Field validity is checked against the target item type; unknown type falls back to `document`. Creators must be either single-field `name` or explicit `firstName`/`lastName`, eliminating Host-side Western-name guessing.

All repository callers, the MCP boundary, and the Rust CLI migrate atomically.

### Original-script metadata is protected field by field

Curator results distinguish original title, alternate translated/romanized titles, container roles, language/script, and creator completeness. Alternate forms are matching evidence only. Exact identifier matches still fall back when they materially contradict the selected item's title, creator, type, or version.

An existing non-Latin title or creator list can be replaced only by authoritative complete metadata in the same script. Language-neutral fields may still be filled when identity is established.

### Curation tagging is an end-of-run workflow responsibility

Single-paper ingest does not know the workflow-specific tag. Search apply filters final outcomes to `needsCuration === true` with `created` or `existing` receipts and valid numeric item IDs.

If at least one target exists, apply first inserts `status:need-metadata-curation` idempotently into the Synthesis SQLite vocabulary using the same save path as Tag Bootstrapper. Only after that succeeds does it add the tag to items. Per-item tag results are collected because the existing handler is not transactional across items.

Curator removes the item tag after `applied` or `verified_no_change`. Removal failure produces a partial cleanup result and leaves the vocabulary entry intact.

### Tag governance remains split by repository ownership

The tag is documented only in `skills_builtin/tag-bootstrapper/references/tag_standard.md`. No tag-regulator files are changed. The SQLite vocabulary remains runtime SSOT; the Markdown reference defines the governed meaning but does not seed every empty vocabulary.

## Risks / Trade-offs

- [Broad strategy-only search depends on available browser/tool access] → Record unavailable source lanes and never claim a connector was executed when only a query hint was generated.
- [Loose discovery produces more noise] → Keep candidate tier and source trace visible; require a stable landing URL before low-completeness ingest.
- [Breaking ingest DTO affects external callers] → Update every in-repository caller and protocol test together; release/version work remains separate.
- [Search mutations precede final vocabulary/tag apply] → Return partial apply receipts without rolling back created Zotero items.
- [Metadata save and tag removal are two transactions] → Preserve the tag and emit a cleanup warning when removal fails.
- [Script detection is imperfect] → Use it only to prevent destructive replacement, never to infer publication language from creator identity or affiliation.

## Migration Plan

1. Add failing contract and behavior tests.
2. Replace the literature-ingest DTO and migrate Host, MCP, CLI, and Skill callers in one change.
3. Update Search Ingest strategy, schemas, ledger, and end-of-run tag apply.
4. Update Curator canonical metadata and original-script protection, then add tag cleanup.
5. Update current-state Skill/reference documentation and OpenSpec deltas.

No release, tag, or backward-compatibility shim is created in this change.

## Open Questions

None.
