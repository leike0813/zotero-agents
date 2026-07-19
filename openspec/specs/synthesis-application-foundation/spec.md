# synthesis-application-foundation Specification

## Purpose
Defines the Synthesis application foundation, specifying the core service wiring, dependency injection, and lifecycle integration.

## Requirements

### Requirement: Citation Graph orchestration has one environment-neutral owner

The application package SHALL own strict private Citation Graph orchestration, graph-result row projection, canonical input/graph hashes, bounded read projection, mutation admission, and basis-guarded metrics/layout promotion without Node, Zotero, Host, UI, plugin service, or worker implementation imports.

#### Scenario: Plugin and shadow share stable projection facts
- **WHEN** production compatibility and private shadow composition project equivalent engine results
- **THEN** they reuse shared row/hash helpers while retaining their distinct persistence owners and routes

### Requirement: Topic orchestration has one environment-neutral owner

The application package SHALL own strict Topic request rebuilding, materialized asset resolution, complete/patch assembly, canonical apply decisions, list/detail projection, operation phases, and post-commit projection warnings without importing Node, Zotero, Host, UI, plugin service, or workflow runtime modules.

#### Scenario: Plugin and Node fixture share pre-commit decisions
- **WHEN** both compositions receive the same Topic bundle and current hashes
- **THEN** they produce identical validation and optimistic conflict decisions while production persistence remains unchanged

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
