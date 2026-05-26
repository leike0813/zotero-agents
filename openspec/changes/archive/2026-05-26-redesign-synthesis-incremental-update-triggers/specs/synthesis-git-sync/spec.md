## ADDED Requirements

### Requirement: Git Sync waits for canonical maintenance epochs

Synthesis Git Sync SHALL delay maintenance-driven autosync until active
canonical update workers have drained and a large debounce window has elapsed.

#### Scenario: Canonical worker writes several records

- **WHEN** an incremental Synthesis worker commits multiple canonical record
  batches
- **THEN** Git Sync SHALL mark a canonical mutation epoch dirty
- **AND** it SHALL NOT run autosync until active canonical workers have drained.

#### Scenario: Debounce window elapses

- **WHEN** active canonical workers have drained and the maintenance debounce
  window elapses
- **THEN** Git Sync MAY run one coalesced autosync attempt.

### Requirement: Projection and job state do not trigger Git Sync

Git Sync SHALL only react to canonical domain asset mutations, not rebuildable
projection or job state writes.

#### Scenario: Projection is rebuilt

- **WHEN** registry, citation graph, metrics, layout, freshness, or worker state
  files are updated
- **THEN** Git Sync SHALL NOT be triggered by those writes.

#### Scenario: Manual sync is requested during maintenance

- **WHEN** manual sync is requested while canonical maintenance workers are
  active or pending
- **THEN** Git Sync SHALL expose pending-worker diagnostics
- **AND** it SHALL continue to respect pause, conflict, and lock gates.
