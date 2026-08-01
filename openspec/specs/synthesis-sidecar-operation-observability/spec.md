# synthesis-sidecar-operation-observability Specification

## Purpose
TBD - created by syncing change govern-synthesis-sidecar-observability. Update Purpose after archive.

## Requirements

### Requirement: Host SHALL own business operation audit

The Host SHALL emit mutation start and terminal records and read/periodic
failure records from the production operation manifest. One invocation SHALL
own at most one failure incident regardless of nested boundary failures.

#### Scenario: Mutation fails in a worker
- **WHEN** a mutation starts and a nested worker failure reaches the Host
- **THEN** Runtime Log contains its start and one failed terminal incident
- **AND** no transport or worker failure is persisted separately

#### Scenario: Status-bearing operation is not successful
- **WHEN** transport succeeds but a declared semantic status is not accepted
- **THEN** the mutation terminal is failed with the public semantic status
