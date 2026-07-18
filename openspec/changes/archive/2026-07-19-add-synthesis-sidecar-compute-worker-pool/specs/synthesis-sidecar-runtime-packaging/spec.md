## ADDED Requirements

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
