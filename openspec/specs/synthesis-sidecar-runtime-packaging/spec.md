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
