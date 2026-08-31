# zotero-library-full-snapshot-feed Specification

## Purpose

Defines one complete, bounded full-library snapshot feed whose trusted Workflow projection, remote Host Bridge projection, and Hermes index refresh share the same Host-owned completeness semantics.

## Requirements

### Requirement: Full-library snapshots SHALL use bounded process-local sessions
The Host SHALL create an opaque snapshot session for one resolved library and stable item scope. A session SHALL have a fixed 30-minute TTL, a fixed total-item hard cap of 1,000,000, a default batch size of 500, a maximum batch size of 1,000, and process-local identity that becomes invalid after Host restart.

#### Scenario: Snapshot completes within bounds
- **WHEN** every item in the fixed snapshot is delivered before TTL and hard limits
- **THEN** the Host returns completed coverage with snapshot identity and completion evidence

#### Scenario: Host restarts during a snapshot
- **WHEN** a caller presents a snapshot identity issued by a previous Host process
- **THEN** the Host rejects it as expired or invalid and requires a fresh snapshot

### Requirement: Snapshot projections SHALL preserve one owner and distinct call shapes
Trusted Workflow callers SHALL use a callback-scoped projection that hides session pagination. Host Bridge, MCP, CLI, and Hermes callers SHALL use opaque snapshot identity and cursor fields suitable for transport. Both projections MUST preserve the same item set, ordering, bounds, and terminal completeness semantics.

#### Scenario: Workflow consumes snapshot batches
- **WHEN** a Workflow caller invokes the snapshot member with a serial callback
- **THEN** it receives ordered batches and one terminal result without observing transport cursors or session-management methods

#### Scenario: Remote caller resumes a page
- **WHEN** a remote caller supplies a valid cursor for the same snapshot session
- **THEN** the Host returns the next bounded page without exposing local paths or internal registry state

### Requirement: Incomplete snapshots SHALL never authorize index replacement
Canceled, expired, resource-limited, failed, cursor-mismatched, or otherwise incomplete snapshots SHALL contain no evidence that permits deleting absent index rows. Consumers MUST retain the prior usable index and start a new snapshot when appropriate.

#### Scenario: Refresh fails after several pages
- **WHEN** Hermes has staged rows from an incomplete snapshot and the session fails
- **THEN** the staged generation is not promoted and the previous index remains readable

### Requirement: Snapshot completion SHALL be transactional for index consumers
An index consumer SHALL stage snapshot rows separately and promote the new generation, including deletion of absent rows, only after validating complete Host-issued evidence for the exact snapshot basis.

#### Scenario: Empty library snapshot completes
- **WHEN** the Host proves a complete empty snapshot
- **THEN** the consumer may atomically promote an empty index and remove all rows from the prior generation

### Requirement: Full snapshot SHALL not become an incremental history protocol
The snapshot feed MUST NOT expose change cursors, deletion tombstones, permanent replay logs, or cross-process resume. Page or mirror caches MAY improve performance but MUST NOT become a correctness source.

#### Scenario: Caller requests changes since a prior snapshot
- **WHEN** a caller attempts to reuse snapshot identity as an incremental change cursor
- **THEN** the request is rejected and the caller must open a new full snapshot