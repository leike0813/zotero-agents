## MODIFIED Requirements

### Requirement: Artifact migration SHALL be an explicit Dashboard-local operation

The product SHALL expose a permanent Dashboard Migrations region with a statically registered Literature Artifact library migration entry. Opening, rendering, selecting, deep-linking, and observing the entry SHALL be side-effect free. Scan, preview, apply, stop, and continue SHALL be callable only from the Dashboard-local migration surface; Workflow Host, Host Bridge, MCP, Pi, and CLI surfaces SHALL not register or proxy the migration operation. Dashboard SHALL project the migration ID and exact current definition version from the registered migration definition rather than duplicating those values.

#### Scenario: The migration entry is unavailable or the scan is empty
- **WHEN** the user opens the Migrations region and the migration cannot run or finds no candidates
- **THEN** the Migrations region and its entry SHALL remain visible
- **AND** the entry SHALL show its own availability or empty result without hiding the surface.

#### Scenario: A user only navigates to migration history
- **WHEN** the user opens, selects, or deep-links to the migration entry or an existing run
- **THEN** the UI SHALL perform observation or navigation only
- **AND** it SHALL not scan, write, create a run, or dispatch a worker.

#### Scenario: A non-Dashboard transport requests migration
- **WHEN** Workflow Host, Host Bridge, MCP, Pi, or CLI receives a migration operation request
- **THEN** the request SHALL be unavailable or rejected as an unsupported operation
- **AND** it SHALL not create a scan or apply effect.

#### Scenario: Migration service is unavailable
- **WHEN** Dashboard cannot resolve the registered migration service
- **THEN** the view SHALL remain unavailable and SHALL NOT offer Apply
- **AND** an unknown non-positive placeholder version SHALL NOT be presented as an executable migration definition.

### Requirement: Restart and definition changes SHALL require a fresh scan

After Zotero or the plugin restarts, an old actionable preview SHALL not be executable. Apply SHALL require the current static migration ID and exact definition version. Dashboard available and busy projections SHALL expose that exact current version. An incompatible old receipt or candidate SHALL fail with a typed stale-plan or version-mismatch outcome while retaining bounded history.

#### Scenario: A user tries to apply a pre-restart preview
- **WHEN** the preview was created before the current process or Zotero restart
- **THEN** apply SHALL reject it as stale
- **AND** the user SHALL be directed to a new explicit scan.

#### Scenario: The migration definition changes
- **WHEN** a stored receipt uses a definition version that is not the current exact version
- **THEN** the receipt's common history summary MAY remain visible
- **AND** no old code or old plan SHALL execute.

#### Scenario: Dashboard projects an actionable migration
- **WHEN** the registered migration service is available or busy
- **THEN** Dashboard SHALL expose the registered migration ID and exact current definition version
- **AND** it SHALL NOT substitute a separately maintained version literal.

### Requirement: Offline legacy import SHALL reuse the migration converter with explicit confirmation

Recognized legacy note or bundle input SHALL be previewed and explicitly confirmed before conversion. Canonical input SHALL use the normal importer. Unknown or damaged input SHALL fail closed. Dashboard migration and offline import SHALL obtain normalized artifacts, classification, reason codes, diagnostics, counts, and basis from the same converter entry and SHALL NOT independently reclassify its result. References-only input MAY convert; paired References/Citation input SHALL commit as a set. Citation-only input SHALL be blocked unless the target parent already has canonical References and the converter can produce deterministic or explicitly accepted unresolved linkage. Original files and ZIPs SHALL never be overwritten or deleted.

#### Scenario: A recognized legacy bundle is imported
- **WHEN** a user selects a recognized legacy file or bundle
- **THEN** the UI SHALL show a bounded preview and require confirmation
- **AND** successful import SHALL write only canonical payloads through the shared converter.

#### Scenario: A Citation-only offline input lacks canonical References
- **WHEN** a selected legacy Citation input targets a parent with no canonical References
- **THEN** conversion SHALL be blocked before any write
- **AND** the original input SHALL remain unchanged.

#### Scenario: An unknown or damaged input is selected
- **WHEN** the converter cannot recognize or safely validate the input
- **THEN** it SHALL fail closed with a validation result
- **AND** it SHALL not create a partial note or attachment.

#### Scenario: Library migration and offline import classify identical input
- **WHEN** both paths submit equivalent legacy artifact facts
- **THEN** they SHALL receive the same classification, reason codes, normalized artifacts, and basis
- **AND** neither path SHALL recompute classification outside the shared converter.
