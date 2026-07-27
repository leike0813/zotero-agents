## ADDED Requirements

### Requirement: Sidecar prebuilds SHALL be exact content-addressed sets

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives, a complete archive-digest manifest,
and a result document using `synthesis-sidecar-runtime-prebuild-result.v1`.

#### Scenario: A requested result identifies another run or source
- **WHEN** synchronization is given a result whose request ID, run ID, source
  SHA, aggregate, set path, repository, or workflow differs from the requested
  identity
- **THEN** it SHALL reject the result before replacing any addon file

### Requirement: Formal sidecar release SHALL require one prepared release set

The release pipeline SHALL only dispatch a manually requested, committed
release set from clean synchronized `main`, materialize the exact verified
aggregate, and write a complete receipt before source-main finalization.

#### Scenario: A plugin release lacks complete sidecar evidence
- **WHEN** a plugin release is attempted without a matching complete receipt,
  release set, materialized inventory, and freshness result
- **THEN** the release gate SHALL fail closed

### Requirement: Recovery SHALL preserve release identity

Resume operations SHALL reuse the same release set, source SHA, result,
aggregate, and receipt. A failed release SHALL not be recovered by selecting a
different successful build.

#### Scenario: A resume requests a different aggregate
- **WHEN** a resumed release request differs from the prepared aggregate
- **THEN** it SHALL be rejected as a different release
