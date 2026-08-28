# synthesis-sidecar-runtime-packaging Specification

## Purpose

Defines the verified, XPI-owned native sidecar runtime installed for the current
plugin version.

## Requirements

### Requirement: The XPI SHALL contain the complete native runtime

Each supported target SHALL contain one manifest-v3 Rust runtime bundle. The
manifest SHALL bind the executable, complete file inventory, hashes,
provenance, protocol, capabilities, target triple, and platform signature.

#### Scenario: A packaged file is missing or changed
- **WHEN** installation verifies the selected target bundle
- **THEN** verification fails before any executable is launched

### Requirement: Installation SHALL expose one current runtime

The installer SHALL materialize the verified packaged bundle at
`runtime/synthesis/service-runtime/current`. It SHALL reuse that directory only
when its manifest and every file match the packaged bundle. Replacement SHALL
use a verified sibling staging directory and an atomic directory swap.

#### Scenario: Current runtime already matches the XPI
- **WHEN** startup verifies the installed current directory
- **THEN** it reuses the same executable without rewriting runtime state

#### Scenario: The XPI runtime changes
- **WHEN** the current directory does not match the packaged bundle
- **THEN** the installer verifies a sibling staging directory and swaps it into
  `current`
- **AND** a failed staging or swap attempt leaves the previous current runtime
  usable

### Requirement: Legacy runtime version state SHALL be inert

Runtime installation and launch SHALL NOT read or write legacy active/previous
pointers, version directories, runtime admission, or cutover receipts.

#### Scenario: Legacy files contain conflicting identities
- **WHEN** the current XPI runtime is installed
- **THEN** startup behavior is unchanged
- **AND** every legacy file remains byte-identical

### Requirement: Manifest expiry SHALL be release metadata

An optional well-formed manifest expiry timestamp MAY be used by release
governance. Local startup SHALL NOT reject an otherwise valid XPI-owned runtime
because wall-clock time passed that timestamp.

#### Scenario: A valid packaged manifest is past expiry
- **WHEN** local installation verifies its files and identity
- **THEN** the runtime remains installable

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
- **THEN** the fixed `current` installation, profiles, sessions, and discovery use the same single runtime root
- **AND** no `synthesis/service-runtime/synthesis/service-runtime` path is read or written
