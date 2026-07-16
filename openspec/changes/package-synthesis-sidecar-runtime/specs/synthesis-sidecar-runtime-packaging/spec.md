## ADDED Requirements

### Requirement: Sidecar runtime bundles have one strict manifest

The system SHALL describe every Synthesis sidecar runtime bundle with the
`synthesis-sidecar-runtime-bundle.v1` manifest and SHALL reject unsafe or
ambiguous manifest input.

#### Scenario: Valid bundle manifest is rebuilt

- **WHEN** a manifest declares one supported platform, fixed Node and protocol
  versions, provenance, executable, entrypoint, and a complete unique file table
- **THEN** the system SHALL return a normalized immutable manifest
- **AND** every declared path SHALL be a canonical relative bundle path.

#### Scenario: Manifest contains an unsafe file entry

- **WHEN** a manifest contains an absolute path, traversal segment, duplicate
  path, symlink, unknown field, invalid size, or invalid SHA-256
- **THEN** the system SHALL reject the entire manifest before reading or writing
  a declared file.

### Requirement: Product-owned runtime platform support is explicit

The runtime bundle system SHALL support only Windows x64, macOS x64/arm64, and
Linux x64/arm64 and SHALL pin Node to `24.18.0`.

#### Scenario: Runtime platform is supported

- **WHEN** platform and architecture resolve to a supported pair
- **THEN** the system SHALL select only the exactly matching packaged bundle.

#### Scenario: Runtime platform is unsupported

- **WHEN** platform or architecture does not match the supported matrix
- **THEN** inspection and installation SHALL return a stable `unsupported`
  state
- **AND** they SHALL NOT fall back to another runtime or inspect PATH.

### Requirement: Packaged and installed bytes are verified

The installer SHALL verify the size and SHA-256 of every declared packaged file
and every staged or active installed file.

#### Scenario: Packaged file does not match its manifest

- **WHEN** any packaged file is missing or its size or SHA-256 differs
- **THEN** installation SHALL fail closed
- **AND** the active pointer SHALL remain unchanged.

#### Scenario: Installed executable lost its POSIX mode

- **WHEN** a valid macOS or Linux runtime is installed without the declared
  executable permission
- **THEN** the installer SHALL repair the permission before promotion
- **AND** the promoted installation SHALL pass a complete verification pass.

### Requirement: Runtime installation is staged and atomically activated

The installer SHALL install immutable versions below the fixed managed runtime
root and SHALL expose a new version only after complete verification.

#### Scenario: New bundle installs successfully

- **WHEN** all packaged files validate and staging completes
- **THEN** the installer SHALL atomically promote the staging directory to
  `versions/<bundleId>`
- **AND** atomically set the active pointer to that verified bundle.

#### Scenario: Staging is interrupted

- **WHEN** copying, permission repair, verification, or promotion fails
- **THEN** the previous active pointer SHALL remain authoritative
- **AND** no partial staging directory SHALL be treated as installed.

#### Scenario: Concurrent installation is requested

- **WHEN** multiple callers request `ensureInstalled()` for the same plugin
  lifecycle
- **THEN** they SHALL share one installation transaction
- **AND** they SHALL receive the same verified snapshot.

### Requirement: Runtime installation supports repair and one-version rollback

The installer SHALL repair a corrupt active bundle from trusted packaged assets
and SHALL preserve one verified previous bundle for explicit rollback.

#### Scenario: Active installation is corrupt

- **WHEN** active pointer resolution finds missing or mismatched installed files
- **THEN** `ensureInstalled()` SHALL reinstall the selected packaged bundle
- **AND** it SHALL not execute the corrupt runtime.

#### Scenario: Previous bundle is valid

- **WHEN** rollback is requested and the previous bundle verifies completely
- **THEN** the installer SHALL atomically swap active and previous bundle
  pointers
- **AND** return the newly active verified paths.

#### Scenario: Previous bundle is invalid

- **WHEN** rollback is requested without a completely verified previous bundle
- **THEN** rollback SHALL fail closed
- **AND** the current active pointer SHALL remain unchanged.

### Requirement: Runtime packaging has release provenance and freshness gates

Every published runtime prebuild and plugin release SHALL prove that Node,
service sources, contracts, packaging policy, licenses, and generated manifests
belong to one current build fingerprint.

#### Scenario: Runtime prebuild is current

- **WHEN** the freshness check runs against synchronized platform assets
- **THEN** all five manifests, files, provenance values, and aggregate
  fingerprints SHALL match the current build inputs.

#### Scenario: Release asset is missing or stale

- **WHEN** a supported platform bundle is absent or has a stale fingerprint
- **THEN** the plugin release gate SHALL fail before XPI publication.
