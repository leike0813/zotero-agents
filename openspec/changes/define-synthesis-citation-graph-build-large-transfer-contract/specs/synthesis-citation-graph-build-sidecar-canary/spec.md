## ADDED Requirements

### Requirement: Graph-build transfer SHALL be an authenticated staging canary
The repository SHALL exercise begin, paged input, seal, internal paged output publication, and paged output reads through the real authenticated sidecar HTTP boundary without routing production graph build through the transfer.

#### Scenario: Staging canary succeeds
- **WHEN** a strict graph-build fixture is split into multiple input and output pages
- **THEN** the service stages and returns those pages with manifest and direct-engine oracle parity while the compute worker remains lazy

#### Scenario: Production build runs
- **WHEN** production refresh or rebuild executes during this change
- **THEN** plugin composition still captures Host facts, computes in process, recaptures basis, and promotes through the repository

### Requirement: Transfer canary SHALL cover payloads beyond one compute body
The staging canary SHALL prove that aggregate input can exceed the 8 MiB compute body limit while each action remains within its independent page and HTTP bounds.

#### Scenario: Aggregate input exceeds 8 MiB
- **WHEN** a generated fixture is uploaded over at least three bounded pages
- **THEN** input seal succeeds without changing the monolithic compute wire limit
