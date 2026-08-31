## ADDED Requirements

### Requirement: Runtime artifacts include the repository foundation
The service TypeScript output, runtime bundle, manifest, fingerprint, and XPI validation SHALL include the shared repository package, Node SQLite adapter, owner, schema identity, relevant package metadata, runtime version inputs, and lockfile.

#### Scenario: Packaged service opens the shadow repository
- **WHEN** packaging tests inspect and execute the emitted runtime
- **THEN** all repository files are present and resolvable without an external SQLite dependency

#### Scenario: Repository changes invalidate the fingerprint
- **WHEN** shared schema, service adapter/owner, package metadata, runtime version, or lockfile content changes
- **THEN** the computed service runtime fingerprint changes
