## ADDED Requirements

### Requirement: Related-items sync is scheduled from graph dirty events

Synthesis SHALL enqueue related-items sync after citation graph structure promotion creates or changes active matched library-to-library edges.

#### Scenario: Graph structure promotion succeeds

- **WHEN** citation graph structure work promotes a graph for the active Registry basis
- **THEN** a related-items sync dirty event SHALL be queued
- **AND** the related-items sync worker SHALL be runnable without an explicitly supplied test host in Zotero runtime.

### Requirement: Related-items sync echo suppression is durable and consumed

Synthesis SHALL suppress Zotero notifier echoes caused by related-items sync through durable sync effect state.

#### Scenario: Zotero emits first sync echo

- **WHEN** Zotero emits a modify or refresh item event matching an awaiting sync effect within the echo window
- **THEN** routing SHALL mark the effect echo as observed
- **AND** it SHALL NOT enqueue Registry reindex, graph work, or another related-items sync loop.

#### Scenario: Later user edit arrives

- **WHEN** a matching Zotero item event arrives after the effect echo has already been observed or after the echo window expires
- **THEN** routing SHALL treat it as a normal Zotero item change.

### Requirement: Pending sync effects recover on worker startup

Synthesis SHALL reconcile pending related-items sync effects before retrying external writes.

#### Scenario: Relation exists after interrupted write

- **WHEN** a pending effect already has the Zotero relation at worker startup
- **THEN** the worker SHALL mark the effect applied or already existed
- **AND** it SHALL preserve durable echo suppression state for the emitted Zotero notifier event.
