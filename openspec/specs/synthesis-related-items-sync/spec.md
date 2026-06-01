## Purpose

Related-items sync is an explicit provenance-protected operation; Zotero Library remains relation truth.

## Requirements

### Requirement: Related-items sync is explicit and provenance protected
Synthesis SHALL update Zotero native related-items only through explicit related-items sync operations or explicit approved review actions.

#### Scenario: Graph cache contains matched edge
- **WHEN** graph cache contains an accepted library-to-library edge
- **THEN** Synthesis SHALL NOT write Zotero related-items automatically
- **AND** it MAY offer an explicit related-items sync operation.

### Requirement: Related-items sync never owns Zotero relation truth
Synthesis SHALL treat Zotero native relation state as Zotero Library truth even when sidecar effects record attempted writes.

#### Scenario: Relation state is inspected
- **WHEN** Synthesis needs current related-items state
- **THEN** it SHALL read Zotero Library relation state
- **AND** sidecar effect rows SHALL be diagnostics/provenance only.
