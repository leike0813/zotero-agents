# Spec Delta

## ADDED Requirements

### Requirement: Development releases have independent version counters
Host Bridge SHALL maintain independent stable and dev CLI counters. Development versions SHALL have the form `X.Y.Z-dev.N`; a development iteration SHALL advance only its prerelease number. Stable preparation SHALL derive its version from the completed stable line, not accumulated development iterations.

#### Scenario: Frequent development iterations
- **WHEN** development versions advance from `0.5.2-dev.0` through `0.5.2-dev.20`
- **THEN** the stable counter remains `0.5.1`
- **AND** the next stable patch remains `0.5.2`.

#### Scenario: Preparing the next line after stable release
- **WHEN** stable `0.5.2` has been prepared and development preparation starts again
- **THEN** its target is `0.5.3-dev.0`, not a prerelease below the stable version.

### Requirement: Publication and recovery are channel isolated
The coordinator SHALL accept stable publication only from `main` and dev publication only from `dev`. The CLI bundle SHALL have distinct stable/dev refs; Generic and Hermes SHALL use `main` and `dev` respectively. Release records, completion receipts, and source finalization SHALL belong to the selected channel. Publication SHALL remain explicitly dispatched and require the existing gates.

#### Scenario: Publishing development surfaces
- **WHEN** an authorized dev release passes all gates
- **THEN** only development surface refs and development source finalization advance
- **AND** stable release history and mutable refs remain unchanged.

#### Scenario: Mismatched publication scope
- **WHEN** a caller requests a dev release from main or a stable release from dev
- **THEN** dispatch fails before any publication effect.

#### Scenario: Resuming an interrupted release
- **WHEN** an interrupted dev release is resumed
- **THEN** the same release-set identity, channel, source, and immutable bytes are reused
- **AND** a stable receipt cannot substitute for its recovery evidence.

### Requirement: Prebuild freshness includes the embedded CLI version
Prebuild selection SHALL bind exact CLI version as well as source fingerprint and seven-platform aggregate. A version-only channel transition SHALL require newly built binaries; manifests SHALL NOT relabel development executable bytes as stable.

#### Scenario: Promoting identical source to stable
- **WHEN** dev and stable candidates share source fingerprint but have different CLI versions
- **THEN** stable preparation reports a required prebuild until the exact stable-version aggregate is available.
