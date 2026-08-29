## ADDED Requirements

### Requirement: Formal runtime inventory SHALL be native-only

Runtime packages, freshness checks, and XPI checks SHALL contain one native
Rust executable plus manifest v2, provenance, license inventory, and product
license for each target and SHALL exclude Node, npm, JavaScript service, and D3
runtime files.

#### Scenario: Native XPI inventory is inspected
- **WHEN** a formal XPI candidate is checked
- **THEN** each supported target SHALL contain exactly the required native runtime files
- **AND** any Node or JavaScript runtime artifact SHALL fail the inventory gate

## REMOVED Requirements

### Requirement: Sidecar runtime bundles have one strict manifest
**Reason**: The v1 manifest describes the transitional Node runtime and conflicts with native manifest v2.
**Migration**: Use `synthesis-sidecar-runtime-bundle.v2`; v1 manifests are not installable or rollback-compatible.

### Requirement: Installed runtime snapshots expose verified launch identity
**Reason**: Node and entrypoint paths are replaced by one verified native executable.
**Migration**: Consumers use implementation, fingerprints, platform signature, and `executablePath`.
