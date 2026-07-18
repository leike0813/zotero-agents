## ADDED Requirements

### Requirement: Literature search ingest SHALL expose search breadth and candidate outcomes
The final result SHALL expose a structured search summary, one outcome ledger, and a run-scoped search-ledger artifact rather than parallel success, missing-PDF, and failure arrays.

#### Scenario: Search result exposes candidate tier and curation need
- **WHEN** the interactive workflow completes
- **THEN** each admitted candidate outcome exposes its discovery tier, source trace, decision, ingest status, item reference when available, and `needsCuration`

### Requirement: Literature metadata curator SHALL protect authoritative original-script metadata
The curator SHALL treat translated and romanized titles and creators as matching evidence and SHALL NOT replace an existing authoritative original-script primary field unless a complete authoritative source in the same script supports the replacement.

#### Scenario: English translation does not replace Chinese title
- **WHEN** an exact identifier lookup returns only an English translated title for an item with an authoritative Chinese title
- **THEN** the curator preserves the Chinese title while allowing supported language-neutral fields to be filled

#### Scenario: Romanized creators do not replace native creators
- **WHEN** an identifier lookup returns an incomplete or romanized creator list for an item with authoritative native-script creators
- **THEN** the curator preserves the existing creators and emits a structured warning

### Requirement: Literature metadata curator SHALL preserve semantic field roles
The curator SHALL distinguish direct-work title, alternate title, journal title, book title, proceedings title, conference name, university, and institution before applying Zotero fields for the resolved item type.

#### Scenario: Container title cannot become work title
- **WHEN** a metadata source exposes only a journal, proceedings, or book container title
- **THEN** the curator does not write that value into the direct-work `title` field

### Requirement: Literature metadata curator SHALL close the curation-tag lifecycle
The curator SHALL remove `status:need-metadata-curation` after metadata is successfully applied or authoritatively verified as requiring no changes, and SHALL retain it for unresolved, conflicted, skipped, or failed results.

#### Scenario: Successful curation removes tag
- **WHEN** curation finishes as `applied` or `verified_no_change`
- **THEN** the workflow removes the status tag from the parent item

#### Scenario: Cleanup failure is partial
- **WHEN** metadata succeeds but tag removal fails
- **THEN** the workflow reports a cleanup warning without rolling back metadata and the tag remains available for retry
