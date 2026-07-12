## Context

The Product materializer currently creates a directory per Topic, per paper, per analysis category, and per source asset. `manifest.json` already provides the machine-readable inventory, but the generated README only reports counts. Existing v1 Products are immutable cached artifacts and have no in-repository consumers that require migration.

## Goals / Non-Goals

**Goals:**

- Make the exported Product discoverable through two semantic directories and stable logical-ID-prefixed filenames.
- Keep the material set, provenance, warnings, and file-integrity behavior intact.
- Give agents and people a detailed, single-language README selected from the workflow locale.
- Make the v2 path contract explicit through the existing manifest schema version.

**Non-Goals:**

- Migrate or rewrite already registered v1 Products.
- Provide a ZIP or Zotero import format.
- Change selection, scoring, payload decoding, or shared Markdown-image rewriting behavior.

## Decisions

- Emit only root files plus `topics/` and `papers/`. Topic reports become `topics/topic-<ordinal>.md`; paper files use `paper-<ordinal>.<kind>[-<ordinal>].<ext>`. This preserves deterministic grouping without directory-per-file nesting.
- Place source images in `papers/` beside their owning source and rewrite links locally in the Research Bundle materializer. This avoids modifying the shared `literatureBundle.mjs`, which has independent user changes.
- Keep `schema_id` and change `schema_version` from `1.0.0` to `2.0.0`; do not add duplicate layout fields or compatibility paths. The major version communicates the breaking external path contract.
- Add normalized `locale` to `WorkflowRuntimeContext`, populated with the existing display-locale resolver. A package-local README renderer owns the eleven static language templates and returns English for unsupported locales. Package hook code must not depend on UI FTL or loader-only message maps.
- Generate README from structured materialization records. It contains stable navigation, layout rules, topic/paper indexes, reading sequence, and manifest/warning semantics; detailed diagnostics remain authoritative in `manifest.json`.

## Risks / Trade-offs

- [External consumers hard-code v1 paths] → Major schema version, README layout declaration, and manifest as the required inventory; retain old Products unchanged.
- [Localized prose diverges across languages] → Use one renderer with shared structured data and test locale selection/fallback separately from copy text.
- [Filename collision or unsafe image name] → Retain logical IDs and image mapping identifiers; sanitize only the original display-name component.
- [Dirty worktree overlap] → Limit implementation to the Research Bundle materializer, runtime context, package manifest, targeted tests, docs, and this change; do not modify shared `literatureBundle.mjs`.

## Migration Plan

New exports use v2 immediately. Existing cached Products retain their v1 files and manifest. Consumers must branch on `schema_version` and use manifest paths rather than inferring directory depth; no rollback rewrite is necessary because producing a new Product is non-destructive.

## Open Questions

None.
