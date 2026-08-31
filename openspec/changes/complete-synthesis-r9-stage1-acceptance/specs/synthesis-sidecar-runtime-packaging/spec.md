## ADDED Requirements

### Requirement: Final package acceptance SHALL verify seven bundles and one universal XPI

The post-retirement acceptance gate SHALL verify all seven manifest-v3 native
bundles and one universal XPI from the same candidate. It SHALL validate exact
inventory, hashes, fingerprints, provenance, SBOM, license material, required
platform signatures, freshness, and the 15 MiB per-target, 75 MiB aggregate,
and 100 MiB universal-XPI compressed budgets. It MUST reject Node/npm
executables or archives, JavaScript service/package trees, D3 runtime,
implementation selectors, stale binaries, and undeclared files.

#### Scenario: Seven-target candidate is assembled
- **WHEN** all target bundles are synchronized into the candidate add-on tree
- **THEN** every bundle matches the same source/toolchain/lock identity and its
  declared manifest-v3 inventory
- **AND** unrelated Host Bridge and add-on files retain their expected bytes

#### Scenario: Universal XPI contains a forbidden or oversized artifact
- **WHEN** final package inventory or size validation runs
- **THEN** acceptance fails before any completion claim

### Requirement: Package acceptance SHALL remain non-publishing

Building, synchronizing, and verifying the acceptance candidate SHALL NOT
create a release, tag, asset publication, feed update, mutable production
pointer, or Gitee synchronization.

#### Scenario: Package validation passes
- **WHEN** every bundle and universal-XPI check succeeds
- **THEN** the result is recorded as acceptance evidence only
- **AND** publication still requires separate explicit authorization
