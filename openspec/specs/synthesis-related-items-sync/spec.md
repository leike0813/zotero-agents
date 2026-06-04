## Purpose

Related-items sync is a visible provenance-protected operation; Zotero Library remains relation truth.

## Requirements

### Requirement: Related-items sync is visible and provenance protected
Synthesis SHALL update Zotero native related-items only through visible related-items sync operations triggered by explicit Synthesis update paths, explicit/debug commands, or approved review actions.

#### Scenario: Synthesis update changes accepted citation facts
- **WHEN** digest apply, Reference Sidecar refresh, or Advanced Matching changes accepted library-to-library citation facts
- **THEN** Synthesis MAY start a separate `related_items_sync` operation
- **AND** failure of that operation SHALL NOT roll back the triggering update.

#### Scenario: Graph cache is unavailable
- **WHEN** related-items sync needs accepted library-to-library edges
- **AND** graph cache is missing, stale, failed, empty, or graph refresh failed
- **THEN** it SHALL resolve accepted edges from active sidecar facts
- **AND** it SHALL NOT rebuild graph cache.

### Requirement: Related-items sync never owns Zotero relation truth
Synthesis SHALL treat Zotero native relation state as Zotero Library truth even when sidecar effects record attempted writes.

#### Scenario: Relation state is inspected
- **WHEN** Synthesis needs current related-items state
- **THEN** it SHALL read Zotero Library relation state
- **AND** sidecar effect rows SHALL be diagnostics/provenance only.
