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
### Requirement: Related-items sync is stale-marked by sidecar changes


Synthesis SHALL mark related-items sync stale when sidecar changes may affect accepted library-to-library citation facts, without requiring current Citation Graph rows to already contain those facts.

#### Scenario: Digest apply marks related-items stale

- **WHEN** literature-digest apply updates sidecar facts for one source ref
- **THEN** related-items sync SHALL be marked stale for that source ref
- **AND** no related-items sync operation SHALL run during apply.

#### Scenario: Reference Sidecar refresh marks related-items stale

- **WHEN** Reference Sidecar refresh changes references artifact state for source refs
- **THEN** related-items sync SHALL be marked stale for those changed source refs
- **AND** no related-items sync operation SHALL run during Reference Sidecar refresh.
### Requirement: Related-items sync follows manual graph refresh


Related-items sync SHALL run after successful manual Citation Graph stale refresh, scoped to the final affected source refs returned by the graph refresh.

#### Scenario: Graph refresh returns source scope

- **WHEN** manual Citation Graph stale refresh expands canonical or binding deltas into affected source refs
- **THEN** the follow-up related-items sync SHALL use those affected source refs
- **AND** it SHALL NOT fall back to a full-library sync because source refs were omitted from the original stale delta.

#### Scenario: Graph refresh is skipped or failed

- **WHEN** manual Citation Graph stale refresh is skipped or fails
- **THEN** related-items sync SHALL NOT run as part of that command.
