## ADDED Requirements

### Requirement: Private Topic Structured Artifact execution SHALL use Rust
Private manifest validation, artifact assembly, artifact validation, and section patch computation SHALL use the four declared Rust operations through the shared pool; TypeScript SHALL remain only the plugin production implementation and differential oracle.

#### Scenario: Isolated Topic apply runs
- **WHEN** the private Topic application validates, assembles, validates, or patches an artifact
- **THEN** it SHALL invoke the corresponding Rust operation
- **AND** it SHALL NOT create an in-process or Node-worker Topic engine.

### Requirement: Arbitrary Topic JSON SHALL use canonical chunk paging
Nested Topic values SHALL be serialized as canonical UTF-8, split into ordered hash-addressed chunks below the page envelope, and reconstructed subject to the existing 32 MiB aggregate-string and one-million-node bounds.

#### Scenario: Topic value crosses one page
- **WHEN** a valid nested artifact is larger than one bounded page
- **THEN** ordered chunks SHALL reconstruct exactly the canonical value
- **AND** no line-sized giant object or full-payload base64 copy SHALL be required.

### Requirement: Topic result validation SHALL preserve failure atomicity
Production rebuilders SHALL verify result structure, versions, request identity, hashes, section identity, ordering, read-set consistency, manifest/artifact invariants, and patch status without rerunning the complete TypeScript algorithm.

#### Scenario: Topic result fails validation
- **WHEN** a result is malformed, basis-inconsistent, dangling, over-limit, truncated, or reports an invalid patch transition
- **THEN** it SHALL be rejected
- **AND** current canonical Topic state SHALL remain unchanged.
