## MODIFIED Requirements

### Requirement: Readonly UI Harness SHALL read Synthesis data from stable SQLite snapshots

The readonly UI harness SHALL support separate plugin runtime and Synthesis SQLite databases.

#### Scenario: Synthesis readonly service is created

- **WHEN** a readonly Synthesis service is created from a Zotero data directory
- **THEN** it SHALL read Synthesis repository state from `zotero-agents/state/synthesis.db`
- **AND** Dashboard and Assistant readonly models SHALL continue reading plugin task state from `zotero-agents/state/zotero-agents.db`.

#### Scenario: Explicit DB paths are provided

- **WHEN** a caller provides explicit plugin and Synthesis DB paths
- **THEN** the harness SHALL use the plugin DB for plugin task read models
- **AND** it SHALL use the Synthesis DB for Synthesis repository read models.
