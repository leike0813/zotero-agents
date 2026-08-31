# synthesis-incremental-update-triggers Specification

## Purpose
Synthesis update triggers are direct sidecar writes and explicit refresh operations, not automatic dirty-event fan-out.

## Requirements

### Requirement: Workflow apply writes scoped sidecar state directly
Workflow apply hooks SHALL update sidecar cache rows directly and atomically for the affected item, topic, artifact, or approved decision. A repeated canonical input SHALL be idempotent, and a failed apply SHALL leave prior usable state intact without a success receipt.

#### Scenario: Literature digest apply succeeds
- **WHEN** a literature digest result is applied for one Zotero item
- **THEN** the host SHALL update that item's artifact projection, changed reference entries, safe binding and citation-role facts, and bounded matching metadata sidecar rows in one transaction
- **AND** it SHALL mark citation graph and related-items caches stale only when reference, binding, or role facts change
- **AND** it SHALL NOT record dirty events or enqueue worker work.

#### Scenario: Literature digest apply is unchanged
- **WHEN** the canonical literature apply input matches the persisted projection
- **THEN** the host SHALL report an unchanged successful result without duplicating state

#### Scenario: Literature digest apply fails
- **WHEN** any validation, preparation, or commit step fails
- **THEN** the host SHALL discard the preparation and preserve the complete pre-apply state

### Requirement: Startup does not reconcile Synthesis cache
Plugin startup SHALL NOT scan Zotero Library to reconcile sidecar cache or enqueue follow-up Synthesis work.

#### Scenario: Plugin starts with existing sidecar state
- **WHEN** Synthesis initializes
- **THEN** it SHALL open the sidecar repository and expose cache status
- **AND** it SHALL NOT run startup reconcile, dirty fan-out, or worker drain.

### Requirement: Canonical maintenance epochs coalesce WebDAV autosync

Synthesis canonical maintenance SHALL publish one WebDAV autosync opportunity
after the active maintenance epoch drains, while projection and job writes
remain outside the trigger boundary.

#### Scenario: Maintenance writes several canonical batches

- **WHEN** active maintenance workers commit several canonical batches
- **THEN** the epoch SHALL be marked dirty once
- **AND** WebDAV autosync SHALL wait for all active workers to drain before its
  debounce window begins.

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

### Requirement: Canonical maintenance SHALL expose one autosync epoch

Reference sidecar refresh SHALL enter the production canonical-maintenance epoch before detached work starts. A promoted terminal SHALL mark the epoch dirty, while unchanged, failed, canceled, timed-out, or panicked terminals SHALL drain the worker without marking a canonical commit.

#### Scenario: Reference refresh overlaps short canonical writes
- **WHEN** one or more short canonical writes commit while Reference refresh is active
- **THEN** the shared epoch is marked dirty
- **AND** the WebDAV debounce begins only after the Reference worker drains

#### Scenario: Reference refresh does not promote
- **WHEN** a Reference refresh returns unchanged or a non-success terminal
- **THEN** that result does not independently schedule WebDAV autosync
- **AND** the maintenance worker count is released on every return and panic path
