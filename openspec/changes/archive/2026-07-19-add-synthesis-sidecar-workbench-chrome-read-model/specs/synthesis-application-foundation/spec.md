## ADDED Requirements

### Requirement: Application use cases are environment-neutral

The system SHALL provide an environment-neutral Synthesis application package whose Workbench operational query depends only on strict contracts and a narrow repository read port. It MUST NOT import Node, Zotero, Host, canonical-file, subprocess, worker, network, or UI runtime dependencies.

#### Scenario: Application package is loaded in both runtimes

- **WHEN** plugin and Node service compositions construct the operational chrome query
- **THEN** both SHALL use the same application implementation
- **AND** environment-specific adapters SHALL remain outside the package.

### Requirement: Operational chrome reads are bounded and side-effect free

The application query SHALL perform only fixed cache lookups and bounded operation reads and SHALL NOT reconcile, update, enqueue, or otherwise mutate repository state.

#### Scenario: Chrome is read repeatedly

- **WHEN** callers read operational chrome multiple times
- **THEN** repository rows SHALL remain unchanged
- **AND** each result SHALL contain at most 50 running jobs and 20 current failed jobs.

### Requirement: Cache readiness and operation progress remain independent

The application query SHALL represent cache readiness independently from operation status and SHALL suppress a failed operation only when a newer related cache basis makes that failure obsolete.

#### Scenario: A refresh is running while the previous cache remains ready

- **WHEN** a related operation is running and the cache basis is ready
- **THEN** the result SHALL report the ready cache and running job independently.

#### Scenario: A newer cache supersedes an old failure

- **WHEN** a cache refreshed or updated after its related failed operation
- **THEN** the old failure SHALL NOT appear in operational background jobs.
