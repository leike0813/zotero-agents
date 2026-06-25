# content-package-subscription Specification

## Purpose
TBD - created by archiving change add-content-package-subscriptions. Update Purpose after archive.
## Requirements
### Requirement: Official content SHALL install from subscription feeds

The plugin SHALL treat official workflows and plugin-side skills as installable
content package artifacts fetched from a content feed rather than as XPI-bundled
runtime content.

#### Scenario: Stable feed is the default user source

- **WHEN** the plugin resolves the default content feed
- **THEN** it SHALL use the `stable` channel
- **AND** it SHALL read from `leike0813/zotero-agents-workflows` on the
  `content-feed` branch on GitHub before trying the Gitee mirror.

#### Scenario: Users can switch visible subscription channels

- **WHEN** the preferences UI displays official Workflow package controls
- **THEN** it SHALL allow selecting `stable` or `beta`
- **AND** it SHALL expose `dev` only while debug mode is enabled.

#### Scenario: Dev channel falls back outside debug mode

- **WHEN** the configured content feed channel is `dev`
- **AND** debug mode is disabled
- **THEN** the effective content feed channel SHALL be `stable`.

#### Scenario: Feed branch remains lightweight

- **WHEN** official Workflow packages are published
- **THEN** zip artifacts SHALL be published as release assets
- **AND** `content-feed` SHALL contain feed metadata, not long-lived package zip
  blobs.

#### Scenario: Feed mirror mismatch is rejected

- **WHEN** both primary and mirror feeds are reachable
- **AND** their revision, package id, package version, package requirements, or
  artifact digest differ
- **THEN** the plugin SHALL reject the feed check
- **AND** it SHALL not install content from either source.

#### Scenario: Feed mirror asset URLs may differ

- **WHEN** both primary and mirror feeds describe the same package semantics
- **AND** only their release asset URLs differ
- **THEN** the plugin SHALL accept the feed check.

### Requirement: Official content packages SHALL declare compatibility

Official content packages SHALL declare package version, content API version,
and semver compatibility ranges for plugin, content API, and Zotero runtime.

#### Scenario: Incompatible package is not installed

- **WHEN** a feed package requires a plugin, content API, or Zotero version that
  the current runtime does not satisfy
- **THEN** the plugin SHALL report the incompatible requirement
- **AND** it SHALL not download or install the package.

#### Scenario: Feed-directed rollback is allowed

- **WHEN** the feed points to a package whose version is lower than the
  installed package
- **AND** the artifact digest and compatibility constraints are valid
- **THEN** the installer SHALL allow the replacement.

#### Scenario: Rollback target is controlled by the feed

- **WHEN** a user wants to roll back the official Workflow package
- **THEN** the plugin SHALL install only the package currently selected by the
  chosen channel feed
- **AND** it SHALL NOT expose arbitrary URL, revision, or local-history rollback
  targets in the preferences UI.

### Requirement: Content package installation SHALL be verified and transactional

The installer SHALL verify package identity, channel, digest, and managed paths
before replacing the effective official content roots.

#### Scenario: Valid package installs official workflows and skills

- **WHEN** a package digest matches the feed artifact digest
- **AND** the package manifest is valid for the requested channel
- **THEN** the installer SHALL replace the official workflow and skill roots
- **AND** it SHALL persist install state for the installed package.

#### Scenario: Install state is stale when files are missing

- **WHEN** the install state file exists
- **AND** the official workflow root no longer contains a recognizable
  `workflow.json` or `workflow-package.json`
- **THEN** the package status SHALL treat official content as not installed
- **AND** it SHALL report stale install-state diagnostics instead of showing the
  package as installed.

#### Scenario: Unsafe package paths are rejected

- **WHEN** a package zip entry is absolute, traverses directories, or is outside
  `content-package.json`, `workflows/`, or `skills/`
- **THEN** the installer SHALL reject the package
- **AND** the previous installed official content SHALL remain effective.

### Requirement: Registry SHALL merge official, dev-local, and user content

Workflow and skill registries SHALL load official subscription content first,
then local development content, then user content.

#### Scenario: Dev-local content is available without debug mode

- **WHEN** `ZOTERO_AGENTS_CONTENT_DEV_ROOT` is set or
  `<runtimeRoot>/content/dev-local` exists
- **THEN** the registry SHALL scan `workflows_builtin` or `workflows` and
  `skills_builtin` or `skills` beneath that root
- **AND** debug mode SHALL control only whether `debug_only` entries are
  visible.

#### Scenario: User content has highest precedence

- **WHEN** official, dev-local, and user roots define the same workflow or skill
  id
- **THEN** the user entry SHALL be effective
- **AND** lower-priority entries SHALL be reported as shadowed diagnostics where
  the registry exposes such diagnostics.

#### Scenario: Default user content directories are created on startup

- **WHEN** plugin startup runs with empty user workflow and skill directory
  preferences
- **THEN** it SHALL create `<runtimeRoot>/content/user/workflows`
- **AND** it SHALL create `<runtimeRoot>/content/user/skills`.

#### Scenario: Debug-only content is hidden outside debug mode

- **WHEN** debug mode is disabled
- **THEN** `debug_only` workflows and skills SHALL not enter the effective
  registry even if they were installed from a dev feed.

### Requirement: Runtime package SHALL not include official content roots

The plugin build artifact SHALL not ship `workflows_builtin/**` or
`skills_builtin/**` as runtime assets.

#### Scenario: Startup does not synchronize packaged content

- **WHEN** plugin startup runs
- **THEN** it SHALL not copy packaged built-in workflow or skill files into the
  runtime data directory
- **AND** registry scans SHALL use installed official content plus dev-local and
  user roots.

