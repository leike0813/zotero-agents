## ADDED Requirements

### Requirement: Citation graph build SHALL use bounded lock sections

Citation Graph construction SHALL hold the per-library write lock only while capturing a durable graph-input basis or conditionally promoting records against that basis.

#### Scenario: Host or engine work is in progress

- **WHEN** Zotero metadata is being loaded or graph nodes, edges, aggregates, ownership, incoming groups, or light metrics are being computed
- **THEN** the per-library write lock SHALL be released
- **AND** unrelated bounded maintenance SHALL be able to acquire the lock.

#### Scenario: Computed graph is promoted

- **WHEN** a graph-build result is ready for persistence
- **THEN** the promotion lock section SHALL only recapture the durable basis, compare it, and transactionally replace the intended graph scope when unchanged.

### Requirement: Citation graph build requests SHALL be explicitly bounded

The production graph-build contract SHALL enforce explicit source, reference-instance, and external-target limits and deterministic checkpoints.

#### Scenario: Production stress tier is accepted

- **WHEN** a request stays within 25,000 source nodes, 1,250,000 reference instances, and 750,000 external or unresolved targets
- **THEN** it SHALL remain eligible for deterministic graph assembly.

#### Scenario: A configured bound is exceeded

- **WHEN** a request exceeds any build bound
- **THEN** it SHALL fail before persistence
- **AND** previous graph rows SHALL remain readable.
