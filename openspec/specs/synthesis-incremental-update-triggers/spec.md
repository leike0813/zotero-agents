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
