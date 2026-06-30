## ADDED Requirements

### Requirement: CLI Install Uses Bundled Source

The preferences CLI installer SHALL install the current-platform binary bundled with the running plugin/XPI, or an explicit `ZOTERO_BRIDGE_CLI` override. It SHALL NOT use a PATH-resolved `zotero-bridge` as the install source.

#### Scenario: PATH binary exists but bundled binary is available

- **WHEN** the resolver finds a `zotero-bridge` binary through PATH
- **AND** the current XPI contains a current-platform bundled binary
- **THEN** the installer installs the bundled binary
- **AND** the PATH binary is not copied into the user install target

### Requirement: CLI Install Upgrades Existing Target

The preferences CLI installer SHALL compare SHA-256 for source and target before writing. Equal hashes SHALL skip content copying and still run POSIX permission repair. Different hashes SHALL replace the target file.

#### Scenario: Target differs from source

- **WHEN** the target install path already contains a different binary
- **THEN** the installer overwrites it with the bundled source binary
- **AND** returns `changed: true`
- **AND** returns `sourceSha256` and `targetSha256`

#### Scenario: Target already matches source

- **WHEN** the target install path already matches the bundled source binary
- **THEN** the installer skips content copying
- **AND** still restores executable permissions on POSIX platforms
- **AND** returns `changed: false`

### Requirement: CLI Install Reports Stable Failure Codes

The preferences CLI installer SHALL return stable structured error codes for target replacement and permission failures.

#### Scenario: Target cannot be replaced

- **WHEN** the installer cannot overwrite or remove the existing target file
- **THEN** it returns `cli_install_target_busy`
- **AND** includes source and target diagnostics in `details`

#### Scenario: POSIX chmod fails

- **WHEN** the install platform is POSIX
- **AND** executable permission restoration fails
- **THEN** installation fails with `cli_permission_update_failed`

### Requirement: CLI Release Manifest Records Build State

The CLI package SHALL maintain a release manifest that records the last published build fingerprint, Cargo CLI version, and platform binary checksums while keeping `Cargo.toml` as the version SSOT.

#### Scenario: Manifest is updated after build

- **WHEN** a full CLI prebuild matrix completes
- **THEN** the release manifest records the CLI version, build fingerprint, platform, binary name, SHA-256 checksum, and file size for each prebuild
