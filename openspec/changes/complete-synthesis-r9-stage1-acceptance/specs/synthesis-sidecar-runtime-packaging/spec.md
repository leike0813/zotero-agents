## ADDED Requirements

### Requirement: Final package acceptance SHALL verify seven bundles and one universal XPI

The post-retirement acceptance gate SHALL verify a trusted prebuild v4 result,
matching verification v2 result, all seven manifest-v3 native bundles, and one
unpublished universal XPI from the same source. It SHALL validate exact
inventory, hashes, fingerprints, provenance, the Cargo-lock-matched
`licenses.json` inventory, native smoke/handshake platform-signature status,
freshness, and the 15 MiB per-target, 75 MiB aggregate,
and 100 MiB universal-XPI compressed budgets. It MUST reject Node/npm
executables or archives, JavaScript service/package trees, D3 runtime,
implementation selectors, stale binaries, and undeclared files.
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

## MODIFIED Requirements

### Requirement: The XPI SHALL contain the complete native runtime

Each supported target SHALL contain one manifest-v3 Rust runtime bundle. The
manifest SHALL bind the executable, complete file inventory, hashes,
provenance, protocol, capabilities, and target triple. Platform-signature
status SHALL be carried by launch configuration and native health/handshake.

#### Scenario: A packaged file is missing or changed
- **WHEN** installation verifies the selected target bundle
- **THEN** verification fails before any executable is launched
