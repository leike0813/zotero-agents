## ADDED Requirements

### Requirement: Packed worker runtime is packaged and fingerprinted
Runtime compilation, bundle manifests, XPI assertions, and fingerprints SHALL include the packed engine, transfer executor, streaming protocol, worker entrypoint, engine version, and lockfile without adding third-party dependencies.

#### Scenario: Runtime bundle is verified
- **WHEN** packaging checks inspect the emitted service runtime
- **THEN** every streaming-worker file SHALL be present and covered by deterministic hashes and existing dependency/license governance
