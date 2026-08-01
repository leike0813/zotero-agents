## ADDED Requirements

### Requirement: Reference refresh SHALL scan once and project changed sources

A Reference refresh operation SHALL capture one bounded Host item/artifact snapshot, compare hashes against current state, and read/project only changed Reference and citation-analysis artifacts. Digest-only changes SHALL not rebuild raw references. Each source-keyed promotion SHALL be atomic and preserve the prior usable source state on failure.

#### Scenario: One source changes in a large library
- **WHEN** one Reference artifact hash changes in a large stable snapshot
- **THEN** refresh reads and projects that source without rematerializing every persisted source for each batch
- **AND** unchanged source facts and caches remain intact

#### Scenario: Changed-source batch fails
- **WHEN** validation, artifact read, worker, basis, or transaction work fails for a changed batch
- **THEN** prior usable facts remain visible and the operation records failure/progress
- **AND** no success receipt or partial source promotion is published

### Requirement: Cache invalidation SHALL follow changed facts

Graph and related-items caches SHALL become stale only when reference, binding, redirect, or citation-role facts change. Descriptor, digest, diagnostic, or matching-metadata changes without graph facts MUST NOT force graph rebuild.

#### Scenario: Digest descriptor changes alone
- **WHEN** a source's digest descriptor changes and all graph input facts are unchanged
- **THEN** its artifact metadata may update
- **AND** graph-related cache bases remain unchanged
