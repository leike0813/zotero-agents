## ADDED Requirements

### Requirement: Runtime packaging SHALL contain the Rust Layout v2 candidate without D3

The packaged runtime SHALL inventory the ForceAtlas2 dependency and its transitive licenses/provenance and SHALL NOT include d3-force, `@types/d3-force`, or a Node layout worker.

#### Scenario: XPI runtime inventory is checked

- **WHEN** a production XPI is inspected
- **THEN** the accepted native candidate and matching manifests SHALL be present
- **AND** D3 layout packages and Node worker artifacts SHALL be absent.

#### Scenario: Five target candidates are measured

- **WHEN** Windows x64, macOS x64/arm64, and Linux x64/arm64 candidates are compressed
- **THEN** each candidate SHALL be at most 15 MiB
- **AND** their aggregate SHALL be at most 75 MiB.
