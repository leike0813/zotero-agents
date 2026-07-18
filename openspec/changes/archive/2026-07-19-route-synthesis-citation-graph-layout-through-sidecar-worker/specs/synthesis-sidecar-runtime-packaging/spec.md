## ADDED Requirements

### Requirement: Production worker routing is fingerprint and freshness gated
The system SHALL include the compiled service worker, synthesis engine, D3
runtime, package versions, and lockfile used by production layout routing in
runtime bundle, manifest, fingerprint, license, freshness, and XPI governance.

#### Scenario: Prebuild matches current source fingerprint
- **WHEN** a production artifact is assembled for release
- **THEN** its platform prebuild must match the current complete runtime fingerprint

#### Scenario: Prebuild is absent or stale
- **WHEN** a platform prebuild does not match the current source fingerprint
- **THEN** release freshness and XPI governance fail closed
- **AND** source tests do not generate, download, publish, or synchronize a replacement
