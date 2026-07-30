## MODIFIED Requirements

### Requirement: Formal runtime inventory SHALL be native-only

Runtime packages, freshness checks, and XPI checks SHALL contain one native
Rust executable plus manifest v3, provenance, license inventory, and product
license for each of `win32-x64`, `darwin-x64`, `darwin-arm64`, `linux-x86`,
`linux-x64`, `linux-arm`, and `linux-arm64`; they SHALL exclude Node, npm,
JavaScript service, and D3 runtime files. Add-on and XPI materialization SHALL
use `bin/<target>/synthesis-sidecar/`, with the sidecar bundle namespaced below
the same platform directory as other native executables.

#### Scenario: Native XPI inventory is inspected
- **WHEN** a formal XPI candidate is checked
- **THEN** each supported target SHALL contain exactly one complete sidecar
  bundle below its platform directory and match the committed release evidence
- **AND** any Node or JavaScript runtime artifact SHALL fail the inventory gate

#### Scenario: Prebuilds are synchronized into an existing add-on tree
- **WHEN** a complete seven-target set replaces the materialized sidecar bundles
- **THEN** all seven bundles SHALL advance transactionally
- **AND** sibling Host Bridge binaries and unrelated native assets SHALL retain
  their existing bytes

### Requirement: Runtime paths SHALL be expanded exactly once

Installer, supervisor, and lifecycle paths SHALL share one expanded runtime
path object rooted at `runtime/synthesis/service-runtime`.

#### Scenario: Production runtime starts
- **WHEN** the packaged bundle is installed and a profile session is created
- **THEN** active pointers, versions, profiles, sessions, and discovery use the same single runtime root
- **AND** no `synthesis/service-runtime/synthesis/service-runtime` path is read or written
