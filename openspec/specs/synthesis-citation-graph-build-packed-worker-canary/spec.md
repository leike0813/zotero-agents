# synthesis-citation-graph-build-packed-worker-canary Specification

## Purpose

Define the production-representative worker canary for staged Citation Graph execution and direct-versus-paged parity.

## Requirements

### Requirement: Native staged graph execution SHALL cross the shared child

The native transfer owner SHALL execute sealed Citation Graph Build input only through the shared persistent pool and Rust worker paged protocol.

#### Scenario: Transfer ownership is traced
- **WHEN** a sealed native session is executed
- **THEN** the owner SHALL provide canonical staged pages to the pool source boundary
- **AND** no transfer module SHALL import or invoke `synthesis-citation-graph-build`

#### Scenario: Direct and paged results are compared
- **WHEN** the same graph request runs through direct and paged native paths
- **THEN** canonical result rows, page bytes, hashes, order, diagnostics, and graph facts SHALL match
