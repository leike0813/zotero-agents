## ADDED Requirements

### Requirement: Related-items sync is explicit and provenance protected
Synthesis SHALL update Zotero native related-items only through explicit related-items sync operations or explicit approved review actions.

#### Scenario: Graph cache contains matched edge
- **WHEN** graph cache contains a matched library-to-library edge
- **THEN** Synthesis SHALL NOT write Zotero related-items automatically
- **AND** it MAY offer an explicit related-items sync operation.

### Requirement: Related-items sync never owns Zotero relation truth
Synthesis SHALL treat Zotero native relation state as Zotero Library truth even when sidecar effects record attempted writes.

#### Scenario: Relation state is inspected
- **WHEN** Synthesis needs current related-items state
- **THEN** it SHALL read Zotero Library relation state
- **AND** sidecar effect rows SHALL be diagnostics/provenance only.

## REMOVED Requirements

### Requirement: Related-items sync is scheduled from graph dirty events
**Reason**: Dirty events are removed and graph refresh must not schedule side effects.
**Migration**: Use explicit related-items sync operation.

### Requirement: Pending sync effects recover on worker startup
**Reason**: Worker startup recovery is removed.
**Migration**: Explicit sync operation inspects current Zotero relation state before writing.
