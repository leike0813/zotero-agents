## ADDED Requirements

### Requirement: Topic synthesis artifacts support soft delete and purge

The Synthesis service SHALL support soft deletion of active topic synthesis
artifacts and physical purge of previously deleted topic artifacts.

#### Scenario: User soft deletes a topic artifact

- **WHEN** an active topic artifact is deleted
- **THEN** the service SHALL remove it from the active artifact index
- **AND** it SHALL preserve the deleted artifact in a deleted-artifact store
- **AND** it SHALL mark or remove active topic definition, resolver, and resolved
  paper set state so the topic is not returned by default inventory calls
- **AND** it SHALL refresh the Zotero mirror from the canonical active state.

#### Scenario: User purges deleted topic artifacts

- **WHEN** deleted topic artifacts are purged
- **THEN** the service SHALL physically remove only deleted-artifact store assets
- **AND** it SHALL NOT remove active topic artifacts, registry projections,
  citation graph projections, ACP run workspaces, or the Zotero anchor item
- **AND** it SHALL refresh the Zotero mirror.

#### Scenario: Mirror refresh fails during lifecycle mutation

- **WHEN** delete or purge changes canonical state but mirror refresh fails
- **THEN** the service SHALL keep the canonical mutation
- **AND** it SHALL return a warning instead of silently reporting full success.
