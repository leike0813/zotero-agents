## ADDED Requirements

### Requirement: Sidecar supervision does not change production ownership

The supervised sidecar SHALL remain mutation-disabled and SHALL not become the
production Synthesis client, database owner, canonical-file owner, or Host
effect caller in this change.

#### Scenario: Plugin launches the sidecar
- **WHEN** the supervisor reaches ready
- **THEN** the default production client SHALL remain the in-process composition
- **AND** service inventory SHALL remain `108 methods / 1 direct consumer`.

### Requirement: The initial supervised service has no descendants

The service SHALL not import or invoke child-process, worker-thread, or
equivalent descendant creation APIs before the worker-pool lifecycle is added.

#### Scenario: Boundary validation runs
- **WHEN** service sources are scanned
- **THEN** descendant process and worker imports SHALL fail the boundary gate.
