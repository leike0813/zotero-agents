# synthesis-sidecar-runtime-packaging Specification

## Purpose
Defines the synthesis sidecar runtime packaging capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.
## Requirements
### Requirement: Runtime bundle SHALL include graph-build compute code

The compiled runtime, manifest, XPI requirements, and source fingerprint SHALL
cover the graph-build engine module and three-operation worker without adding a
third-party dependency.

#### Scenario: Runtime bundle is assembled
- **WHEN** a source runtime bundle is built
- **THEN** it SHALL contain the compiled graph-build module, protocol, pool, worker, and existing dependency licenses

#### Scenario: Runtime source changes
- **WHEN** graph-build engine or worker source changes without regenerated prebuilds
- **THEN** freshness governance SHALL fail closed until the separate release workflow produces matching assets

### Requirement: Citation Graph application artifacts are packaged and fingerprinted

The temporary v1 Node oracle runtime SHALL include the target-matching Rust Metrics executable and provenance as ancillary hashed files while retaining the Node executable and JavaScript entrypoint as the v1 launch target. Native candidates SHALL also be built independently for five targets and SHALL NOT enter the formal XPI or native manifest v2 release chain in this change.

#### Scenario: Rust source or lock changes
- **WHEN** Rust Metrics sources, the locked toolchain, or `Cargo.lock` change
- **THEN** candidate and temporary runtime fingerprints SHALL change and stale or mismatched binaries SHALL be rejected

#### Scenario: V1 runtime is launched
- **WHEN** the supervisor resolves the active v1 bundle
- **THEN** its launch config, discovery, Node executable, entrypoint, and active/previous pointer semantics SHALL remain unchanged

### Requirement: Runtime bundles SHALL carry the complete compute worker graph

Each runtime target SHALL include the compiled worker entrypoint, required
synthesis-engine modules, exact runtime files for `d3-force`, `d3-dispatch`,
`d3-quadtree`, and `d3-timer`, and the applicable third-party license texts.

#### Scenario: Runtime manifest is rendered

- **WHEN** a sidecar runtime bundle is assembled
- **THEN** every worker, engine, D3 runtime, and license file SHALL appear in the
  strict sorted manifest
- **AND** no network or package-manager install SHALL be required at runtime.

### Requirement: Compute runtime inputs SHALL participate in fingerprinting

The runtime build fingerprint SHALL include service, worker, synthesis-engine,
D3 package versions/runtime files, and the root lockfile.

#### Scenario: Worker or dependency input changes

- **WHEN** a fingerprinted engine, worker, package version, runtime file, or
  lockfile changes
- **THEN** the build fingerprint SHALL change
- **AND** stale prebuilds SHALL fail the existing fingerprint gate.

### Requirement: Source verification SHALL not publish runtime prebuilds

This change SHALL verify source assembly and manifest behavior without
downloading, publishing, or synchronizing five-platform runtime prebuilds.

#### Scenario: Production source build runs

- **WHEN** the repository production build is executed
- **THEN** compute packaging invariants SHALL be checked from repository inputs
- **AND** no release publication SHALL be required.

### Requirement: Runtime artifacts include the repository foundation

The service TypeScript output, runtime bundle, manifest, fingerprint, and XPI validation SHALL include the shared repository package, Node SQLite adapter, owner, schema identity, relevant package metadata, runtime version inputs, and lockfile.

#### Scenario: Packaged service opens the shadow repository
- **WHEN** packaging tests inspect and execute the emitted runtime
- **THEN** all repository files are present and resolvable without an external SQLite dependency

#### Scenario: Repository changes invalidate the fingerprint
- **WHEN** shared schema, service adapter/owner, package metadata, runtime version, or lockfile content changes
- **THEN** the computed service runtime fingerprint changes

### Requirement: Topic application artifacts are packaged and fingerprinted

The runtime build, bundle inventory, XPI inspection, and fingerprint SHALL include all Topic application contracts, sources, repository facts, and designated Node adapters.

#### Scenario: Topic application source changes invalidate the runtime
- **WHEN** a fingerprinted Topic application or adapter source changes
- **THEN** the runtime fingerprint changes and exact bundle inventory still passes

### Requirement: Packed worker runtime is packaged and fingerprinted

Runtime compilation, bundle manifests, XPI assertions, and fingerprints SHALL include the packed engine, transfer executor, streaming protocol, worker entrypoint, engine version, and lockfile without adding third-party dependencies.

#### Scenario: Runtime bundle is verified
- **WHEN** packaging checks inspect the emitted service runtime
- **THEN** every streaming-worker file SHALL be present and covered by deterministic hashes and existing dependency/license governance

### Requirement: Runtime bundle SHALL include transfer implementation inputs

The service build, runtime bundle manifest, and build fingerprint SHALL include the transfer contract, engine page validators, service owner, server dispatch, and their source inputs.

#### Scenario: Runtime bundle is inspected
- **WHEN** the sidecar service is compiled and packaged
- **THEN** the emitted transfer modules are present and fingerprinted with the existing contracts, engine, service, lockfile, and dependency inputs

#### Scenario: Dependencies are inspected
- **WHEN** transfer staging is packaged
- **THEN** no new runtime dependency or license is required

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

### Requirement: Production worker routing is fingerprint and freshness gated

The system SHALL include the compiled service worker, synthesis engine, D3
runtime, package versions, and lockfile used by production layout routing in
runtime bundle, manifest, fingerprint, license, freshness, and XPI governance.

#### Scenario: Prebuild matches current source fingerprint
- **WHEN** a production artifact is assembled for release
- **THEN** its platform prebuild must match the current complete runtime fingerprint

#### Scenario: Prebuild is absent or stale
- **WHEN** a platform prebuild does not match the current source fingerprint
- **THEN** release freshness and XPI governance fail closed
- **AND** source tests do not generate, download, publish, or synchronize a replacement

### Requirement: Packaged runtime contains the metrics worker route

The runtime bundle and build fingerprint SHALL cover the multi-operation worker,
pool, server, synthesis-engine metrics implementation, dependency versions, and
lockfile without introducing additional dependencies.

#### Scenario: Runtime bundle is inspected
- **WHEN** packaging governance examines a built source runtime
- **THEN** the worker, pool, engine, existing d3 runtime files, and licenses are present and fingerprinted

#### Scenario: Platform prebuild is stale
- **WHEN** a platform prebuild fingerprint does not match the metrics-capable source runtime
- **THEN** freshness and XPI release checks fail closed until the release workflow regenerates it

### Requirement: Installed runtime snapshots expose verified launch identity

A ready installed runtime snapshot SHALL expose the verified bundle, Node,
service, and protocol identity used by the supervisor handshake.

#### Scenario: Installed runtime verifies
- **WHEN** active runtime verification succeeds
- **THEN** the snapshot SHALL include bundle ID, Node version, service version,
  protocol version, install root, Node path, and entrypoint path.
