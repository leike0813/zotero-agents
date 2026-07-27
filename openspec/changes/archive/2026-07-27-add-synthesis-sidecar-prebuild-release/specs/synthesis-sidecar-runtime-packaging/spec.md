## MODIFIED Requirements

### Requirement: Formal runtime inventory SHALL be native-only

Runtime packages, freshness checks, and XPI checks SHALL contain one native
Rust executable plus manifest v3, provenance, license inventory, and product
license for each of `win32-x64`, `darwin-x64`, `darwin-arm64`, `linux-x86`,
`linux-x64`, `linux-arm`, and `linux-arm64`; they SHALL exclude Node, npm,
JavaScript service, and D3 runtime files.

#### Scenario: Native XPI inventory is inspected
- **WHEN** a formal XPI candidate is checked
- **THEN** each supported target SHALL contain exactly the required native
  runtime files and match the committed complete sidecar release evidence
- **AND** any Node or JavaScript runtime artifact SHALL fail the inventory gate
