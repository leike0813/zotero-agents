## ADDED Requirements

### Requirement: Documentation describes the current production compute topology
Current-state Synthesis documentation SHALL state that Citation Graph layout
compute runs in the sidecar worker while the plugin owns DB reads, basis checks,
promotion, canonical files, and all other production engines.

#### Scenario: Runtime and progress docs are reviewed
- **WHEN** a maintainer reads runtime, supervision, packaging, performance, README, and Stage 1 documents
- **THEN** the one-kernel route, immediate fail-closed readiness, no-fallback policy, and unchanged public API are explicit

#### Scenario: Release documentation is reviewed
- **WHEN** source routing lands before refreshed platform prebuilds
- **THEN** documentation states that release remains blocked until the separate prebuild pipeline produces the current fingerprint
