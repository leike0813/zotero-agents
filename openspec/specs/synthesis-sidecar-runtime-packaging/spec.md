# synthesis-sidecar-runtime-packaging Specification

## Purpose

Defines the verified, XPI-owned native sidecar runtime installed for the current
plugin version.

## Requirements

### Requirement: The XPI SHALL contain the complete native runtime

Each supported target SHALL contain one manifest-v3 Rust runtime bundle. The
manifest SHALL bind the executable, complete file inventory, hashes,
provenance, protocol, capabilities, and target triple. Platform-signature
status SHALL be carried by launch configuration and native health/handshake.

#### Scenario: A packaged file is missing or changed
- **WHEN** installation verifies the selected target bundle
- **THEN** verification fails before any executable is launched

### Requirement: The Windows runtime SHALL be self-contained

The `win32-x64` release executable SHALL statically link the MSVC C runtime and
MUST NOT require a separately installed Visual C++ Redistributable.

#### Scenario: The Windows runtime starts on a clean supported host
- **WHEN** the verified executable is launched without a system-installed MSVC runtime
- **THEN** it reaches the sidecar CLI entrypoint without a loader dependency failure

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

Runtime source inputs, packages, freshness checks, candidate workflows, and XPI
checks SHALL contain one native Rust executable plus manifest v3, provenance,
SBOM/license inventory, and product license for each supported target. They
MUST exclude Node/npm executables or archives, JavaScript service/package
trees, Node manifests or entrypoints, D3 runtime files, undeclared binaries,
and implementation selectors. Per-target compressed runtime size MUST remain
at or below 15 MiB, the seven-target aggregate at or below 75 MiB, and final
universal XPI size at or below 100 MiB.

#### Scenario: Native XPI inventory is inspected
- **WHEN** a formal XPI candidate is checked
- **THEN** each supported target contains exactly the required signed/verified native runtime inventory for that acceptance stage
- **AND** any Node, npm, JavaScript service, D3 runtime, stale, missing, duplicate, undeclared, fingerprint-mismatched, or oversized artifact fails the gate

#### Scenario: Repository delivery graph is inspected
- **WHEN** workspaces, package scripts, workflow paths, runtime packaging inputs, runtime installation, and release inventory are checked
- **THEN** all Synthesis runtime delivery paths resolve to manifest-v3 Rust bundles and the one fixed `current` installation
- **AND** no Node delivery, runtime pointer, candidate resolver, or rollback path remains

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

### Requirement: Native-only inventory gates SHALL survive implementation deletion

Removing obsolete Node/D3 packaging code SHALL NOT remove the negative
inventory guarantees. The surviving checks SHALL reject forbidden runtime
classes and identities directly and MUST NOT require a deprecated Node manifest,
workspace, or generated comparison artifact to run.

#### Scenario: Deleted Node workspace is absent
- **WHEN** package and XPI checks run after `apps/synthesis-service` is removed
- **THEN** they complete from current Rust manifests, provenance, licenses, source fingerprints, and package contents
- **AND** absence of the old workspace is treated as the required state rather than a missing fixture

### Requirement: Final package acceptance SHALL verify seven bundles and one universal XPI

The post-retirement acceptance gate SHALL verify a trusted prebuild v4 result,
matching verification v2 result, all seven manifest-v3 native bundles, and one
unpublished universal XPI from the same source. Every additional host-built
XPI used by a blocking environment SHALL pass the same exact inventory,
hash, fingerprint, provenance, and Cargo-lock-matched
`licenses.json` inventory, native smoke/handshake platform-signature status,
freshness, and the 15 MiB per-target, 75 MiB aggregate,
and 100 MiB universal-XPI compressed budgets. It MUST reject Node/npm
executables or archives, JavaScript service/package trees, D3 runtime,
implementation selectors, stale binaries, and undeclared files.
Host-built XPI digests MAY differ, but their source commit and seven native
bundle identities MUST match.
For this unpublished candidate, `unsigned-candidate` is an acceptable
Windows/macOS status and `not-applicable` is the Linux status. This gate does
not claim a separate SBOM receipt or signed release binaries; release signing
remains governed separately. Manifest v3 does not carry a signature field.

#### Scenario: Seven-target candidate is assembled
- **WHEN** all target bundles are synchronized into the candidate add-on tree
- **THEN** every bundle matches the same source/toolchain/lock identity and its
  declared manifest-v3 inventory
- **AND** unrelated Host Bridge and add-on files retain their expected bytes

#### Scenario: Universal XPI contains a forbidden or oversized artifact
- **WHEN** final package inventory or size validation runs
- **THEN** acceptance fails before any completion claim

#### Scenario: A platform test stages different XPI bytes
- **WHEN** a test stages a current-source sidecar or rebuilds its own XPI
- **THEN** its result cannot satisfy final package acceptance until the
  installed XPI digest and selected bundle match the pinned candidate

### Requirement: Package acceptance SHALL remain non-publishing

Building, synchronizing, and verifying the acceptance candidate MAY publish
the governed immutable prebuild set but SHALL NOT create a release, release
tag, release asset, feed update, mutable production pointer, or Gitee
synchronization.

#### Scenario: Package validation passes
- **WHEN** every bundle and universal-XPI check succeeds
- **THEN** the result is recorded as acceptance evidence only
- **AND** publication still requires separate explicit authorization
