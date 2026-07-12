# Tag Auditor

## Purpose

Scan all top-level regular items in the Zotero library against the controlled tag vocabulary and report per-item tag compliance. Results are written to the Synthesis Workbench Tags audit panel for review and subsequent regulation.

## Inputs

No parameters and no Zotero item selection required. The workflow operates on the entire library.

## Behavior

1. Load the controlled tag vocabulary from Synthesis via `exportTagVocabularyForRegulator`.
2. Page all top-level regular items in the library (excluding child items, notes, attachments, and deleted items).
3. For each item, collect its current tags and evaluate compliance: a tag is non-compliant if it is not present in the controlled vocabulary.
4. Group audit entries by library ID and write them to Synthesis via `replaceTagAuditRecords`.

The workflow is fully automatic and does not modify any Zotero items or tags. It is a read-only scan that produces audit records for the Tags panel.

## Output And Apply

The Synthesis Workbench Tags audit panel displays per-item audit records, each containing:

| Field | Description |
|-------|-------------|
| `itemKey` | The Zotero item key |
| `compliant` | Whether all tags on the item are in the controlled vocabulary |
| `nonCompliantTags` | List of tags not found in the controlled vocabulary |

The run result summarizes the number of audited items and items needing tag regulation per library. Running the workflow again replaces the previous audit records (idempotent within the same vocabulary state).

A prerequisite is that a controlled tag vocabulary must already be defined in the Tags page of Synthesis Workbench.

## Dependencies

- No backend connection required
- **Controlled Vocabulary**: A controlled tag vocabulary must be defined first; see [Tags Management](#doc/synthesis%2Ftags)

## Related Workflows

- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Normalize tags based on the controlled vocabulary and infer new tags
- [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) — Interactively create a controlled tag vocabulary
