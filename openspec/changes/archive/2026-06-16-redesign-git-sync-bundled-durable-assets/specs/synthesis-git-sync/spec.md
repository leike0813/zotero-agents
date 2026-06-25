## MODIFIED Requirements

### Requirement: Git Sync exports only allowlisted canonical assets

Git Sync SHALL only export durable Synthesis exchange assets and generated manifests. Rebuildable projection/cache assets SHALL NOT be eligible for Git Sync export.

#### Scenario: Durable bundle store is exported

- **WHEN** an export snapshot is built
- **THEN** durable Synthesis facts SHALL be written under `bundles/`
- **AND** root `manifest.json` SHALL describe bundle files and per-entity hashes
- **AND** `sync/sync-manifest.json` MAY describe the exported file set for the Git adapter.

#### Scenario: Rebuildable projection files exist

- **WHEN** citation graph cache, graph layout, metrics, cache basis, operation rows, runtime logs, workspaces, locks, temp dirs, queue state, conflict state, or remote state exist locally
- **THEN** those files SHALL NOT be exported
- **AND** imported durable state SHALL mark affected projections stale rather than ready.

### Requirement: Git Sync validates imports before promotion

Imported worktree content SHALL pass validation before it can hydrate local durable state.

#### Scenario: Bundle import is valid

- **WHEN** a manifest declares durable bundles
- **THEN** each bundle path, bundle hash, bundle schema, entry hash, entity schema, and duplicate entity guard SHALL be validated before promotion
- **AND** conflict checks SHALL use per-entity hashes from the manifest entry index.

#### Scenario: Legacy per-entity import is valid

- **WHEN** a legacy schema `1.0.0` per-entity durable manifest is imported
- **THEN** Git Sync MAY read it for migration
- **AND** the next export SHALL write bundle schema `2.0.0`.

#### Scenario: Import exceeds configured limits

- **WHEN** a bundle import exceeds bundle count, entry count, total byte, or single bundle byte limits
- **THEN** import SHALL fail with `import_size_limit_exceeded` or `bundle_size_limit_exceeded`
- **AND** diagnostics SHALL include bundle count, entry count, total bytes, largest bundle bytes, and largest bundle path where known.
