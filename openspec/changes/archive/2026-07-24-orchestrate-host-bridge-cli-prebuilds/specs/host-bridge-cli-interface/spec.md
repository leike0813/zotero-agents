## ADDED Requirements

### Requirement: CLI prebuild commands SHALL separate local and remote builds

`prebuild:zotero-bridge-cli` SHALL orchestrate the complete remote
seven-platform prebuild flow. `build:local:zotero-bridge-cli` SHALL retain the
existing current-platform local build behavior.

#### Scenario: Local developer needs one platform

- **WHEN** the local build alias is invoked
- **THEN** it SHALL run the existing local Rust build and packaging path
- **AND** SHALL NOT dispatch a GitHub workflow.

#### Scenario: Remote prebuild source is not synchronized

- **WHEN** the tree is dirty, HEAD is detached, upstream is missing, HEAD is not
  pushed, the remote tip differs, or explicit ref/source identity conflicts
- **THEN** remote orchestration SHALL fail before dispatch.

### Requirement: Prebuild workflow SHALL publish a structured result

The seven-platform workflow SHALL require `request_id` and SHALL upload one
`host-bridge-cli-prebuild-result.v1` artifact after publishing or reusing the
complete immutable set.

#### Scenario: Result artifact is produced

- **WHEN** all seven archives and the remote set manifest have been verified
- **THEN** the result SHALL bind request id, workflow run, source SHA, ref, CLI
  version, build fingerprint, binary aggregate, prebuild branch commit, and
  immutable set path.

#### Scenario: Result identity is incomplete

- **WHEN** any required result field is missing or malformed
- **THEN** local synchronization SHALL reject the result before modifying
  binaries or release manifests.

### Requirement: Prebuild synchronization SHALL use explicit identity atomically

`sync:host-bridge-cli-prebuilds --identity-file=<result.json>` SHALL use the
structured result as the expected remote identity and SHALL validate the
remote manifest and all seven archives before replacing local state.

#### Scenario: Local manifest has an old aggregate

- **WHEN** the local release manifest records an older aggregate but the result
  file, remote manifest, version, fingerprint, archives, and aggregate agree
- **THEN** synchronization SHALL restore the result's seven-platform set
- **AND** SHALL recalculate local checksums and release manifests.

#### Scenario: Any identity component conflicts

- **WHEN** version, fingerprint, aggregate, set path, branch commit, archive
  checksum, binary checksum, or platform inventory differs
- **THEN** synchronization SHALL fail
- **AND** existing `addon/bin` files and release manifests SHALL remain
  unchanged.
