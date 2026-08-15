# synthesis-invariant-guardrails Specification

## Purpose

Define static ownership and composition guards for the native Synthesis service, workers, and transfer path.

## Requirements

### Requirement: Native worker-transfer ownership SHALL be statically guarded

Invariant governance SHALL reject transfer-to-kernel imports and worker-to-application authority imports in active native source.

#### Scenario: Transfer module is inspected
- **WHEN** static checks scan `runtime_transfer`
- **THEN** imports or calls to graph, metrics, layout, repository, canonical, Host, or production-root authorities SHALL fail

#### Scenario: Worker modules are inspected
- **WHEN** static checks scan `runtime_worker` and `runtime_worker_pool`
- **THEN** repository, canonical, Host, production-root, HTTP capability, and service composition dependencies SHALL fail

### Requirement: Native lifecycle ownership SHALL be semantically guarded

Static governance SHALL enforce the native runtime's public interface and authority placement without constraining source-file length or requiring implementation-text snapshots.

#### Scenario: Runtime ownership checks run
- **WHEN** static governance inspects the native sidecar
- **THEN** the executable SHALL remain free of production runtime module declarations
- **AND** the library SHALL keep runtime implementation modules private
- **AND** worker frame variants and capability match handlers SHALL remain outside production lifecycle composition

#### Scenario: Runtime tests are inspected
- **WHEN** tests exercise worker or serve lifecycle behavior
- **THEN** they SHALL use the library interface or a private internal seam
- **AND** integration tests SHALL NOT recompile production source files through path-based module declarations
