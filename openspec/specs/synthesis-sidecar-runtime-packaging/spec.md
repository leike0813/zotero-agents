# synthesis-sidecar-runtime-packaging Specification

## Purpose

Defines the native-only sidecar runtime inventory, platform-first add-on
materialization, and synchronization isolation required for plugin packaging.

## Requirements

### Requirement: Formal runtime inventory SHALL be native-only

Runtime packages, freshness checks, and XPI checks SHALL contain one native
Rust executable plus manifest v3, provenance, license inventory, and product
license for each of `win32-x64`, `darwin-x64`, `darwin-arm64`, `linux-x86`,
`linux-x64`, `linux-arm`, and `linux-arm64`; they SHALL exclude Node, npm,
JavaScript service, and D3 runtime files. Add-on and XPI materialization SHALL
use `bin/<target>/synthesis-sidecar/`, with the bundle namespaced under the same
platform directory as other native executables.

#### Scenario: Native XPI inventory is inspected
- **WHEN** a formal XPI candidate is checked
- **THEN** each supported target SHALL contain exactly the required native
  runtime files and match the committed complete sidecar release evidence
- **AND** any Node or JavaScript runtime artifact SHALL fail the inventory gate

#### Scenario: Prebuilds are synchronized into an existing add-on tree
- **WHEN** a complete seven-target set replaces the materialized sidecar bundles
- **THEN** all seven bundles SHALL advance transactionally
- **AND** sibling Host Bridge binaries and unrelated native assets SHALL retain
  their existing bytes

### Requirement: Runtime installation SHALL retain admission-pinned generations

The installer SHALL resolve verified native bundles by build fingerprint and
SHALL retain the current admitted generation and any pending target generation
until the admission transition completes or is safely reversed.

#### Scenario: Compatible upgrade begins
- **WHEN** current and target build fingerprints are verified
- **THEN** both content-addressed runtime bundles remain addressable for the bounded attempt

#### Scenario: Pre-activation recovery restarts the old generation
- **WHEN** the target fails before durable activation
- **THEN** the supervisor launches the exact previously admitted verified bundle without using a mutable active pointer
