## Overview

`literature-metadata-curator` runs on exactly one selected parent item. It first performs read-only local planning in `hooks.preflight`; if Zotero's identifier lookup produces trustworthy metadata, the workflow skips provider dispatch and applies that result through the normal apply seam. Otherwise it builds one automatic SkillRunner job for a small metadata search skill.

## Workflow Data Shape

Both local lookup and SkillRunner fallback return the same business result:

```json
{
  "kind": "literature_metadata_curation",
  "status": "succeeded",
  "source": "zotero-translate-search",
  "metadata": {
    "fields": {},
    "creators": []
  },
  "evidence": [],
  "warnings": []
}
```

`metadata.fields` contains Zotero item fields only. `metadata.creators` contains Zotero creator objects with `creatorType` and either `name` or `firstName`/`lastName`.

## Preflight Strategy

The preflight hook resolves the selected parent from `selectionContext`, captures a compact parent snapshot, and checks DOI first, then ISBN. DOI uses `new Zotero.Translate.Search().setIdentifier({ DOI })`; ISBN uses `setSearch({ itemType: "book", ISBN })`. Translation runs with `libraryID: false` and `saveAttachments: false` so it never creates Zotero items.

A local result is accepted only when the translator returns at least one item, the candidate identifier matches the input identifier after normalization, and the candidate has a title or other core bibliographic fields. Empty DOI/ISBN, no translators, no returned items, mismatched identifiers, and translator exceptions are treated as non-fatal fallback reasons.

## Apply Strategy

The apply hook reads canonical result JSON from `resultContext.resultJson` first, then `runResult.resultJson`. It normalizes fields, drops unsupported mutation surfaces (`itemType`, attachments, notes, tags, collections, seeAlso), and calls `handlers.parent.updateMetadata()`.

The handler resolves the parent item, filters fields through the current Zotero item type, replaces creators when a non-empty creator list is provided, and saves once. This keeps author writes in the same host-owned handler boundary as scalar field writes.

## SkillRunner Fallback

The fallback skill receives only a parent metadata snapshot and preflight diagnostics. It may use normal agent search capabilities to find better bibliographic metadata, but it must not call Zotero Host Bridge, mutate Zotero, create attachments, or import items. Its final output must be the canonical JSON object consumed by the apply hook.

`literature-metadata-search` is an automation-facing but lightweight skill. It has no SQLite runtime, gate script, or cross-session state. Its contract is expressed through `assets/input.schema.json`, `assets/output.schema.json`, and `assets/runner.json`. The input schema keeps `parent` as the source-record field for workflow compatibility, while the skill instructions describe it as a generic bibliographic record so the same package can be injected into ACP Chat and executed by a normal agent outside this workflow.

The skill accepts only evidence-backed metadata. Identifier matches are strongest and require normalized DOI, ISBN, PMID, or arXiv equality. Title-based resolution requires a normalized title match plus corroborating creator, year, venue, publisher, volume/issue/pages, institution, or repository evidence. Weak, conflicting, or multi-candidate results produce a canonical `skipped` output instead of speculative metadata.

ACP Chat injection uses the existing explicit injected-skill id list. Adding this skill to that list materializes the same package into all supported agent-family skill roots; it does not change ACP Chat startup prompt semantics or Host Bridge permissions.

## Non-Goals

- No human candidate confirmation in v1.
- No item type conversion.
- No attachment, note, tag, collection, or related-item mutation.
- No runtime protocol changes beyond using the already-available preflight hook.
- No dedicated scripts for metadata search in v1; schema validation is the machine boundary and candidate matching remains an LLM judgment.
