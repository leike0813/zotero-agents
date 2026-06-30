## ADDED Requirements

### Requirement: Managed local SkillRunner runtime version SHALL come from a runtime feed
The plugin SHALL resolve the managed local SkillRunner runtime target version from a single runtime feed that maps plugin version ranges to SkillRunner release tags.

#### Scenario: Primary runtime feed resolves
- **GIVEN** the primary runtime feed is available
- **AND** it contains a match for the current plugin version
- **WHEN** the managed local runtime prepares deployment
- **THEN** the plugin SHALL use the matching SkillRunner release tag.

#### Scenario: Fallback runtime feed resolves
- **GIVEN** the primary runtime feed is unavailable or has no compatible match
- **AND** the fallback runtime feed is available
- **WHEN** the managed local runtime prepares deployment
- **THEN** the plugin SHALL use the matching SkillRunner release tag from the fallback feed.

#### Scenario: Runtime feed cache resolves
- **GIVEN** both remote runtime feeds are unavailable
- **AND** a previously fetched compatible runtime feed is cached
- **WHEN** the managed local runtime prepares deployment
- **THEN** the plugin SHALL use the cached matching SkillRunner release tag.

#### Scenario: Embedded fallback resolves
- **GIVEN** both remote runtime feeds are unavailable
- **AND** no compatible cached feed exists
- **WHEN** the managed local runtime prepares deployment
- **THEN** the plugin SHALL use the embedded fallback SkillRunner release tag.

#### Scenario: Hidden version override resolves
- **GIVEN** `skillRunnerLocalRuntimeVersion` has a non-empty value
- **WHEN** the managed local runtime prepares deployment
- **THEN** the plugin SHALL use that value instead of consulting the runtime feed.

### Requirement: Managed local runtime SHALL redeploy when installed version differs
The plugin SHALL treat a managed local runtime whose stored `versionTag` differs from the resolved target version as needing deployment.

#### Scenario: Existing runtime version matches
- **GIVEN** managed local runtime state includes runtime info
- **AND** `versionTag` equals the resolved target SkillRunner release tag
- **WHEN** one-click local runtime preparation runs
- **THEN** the plugin MAY reuse the existing runtime after preflight succeeds.

#### Scenario: Existing runtime version differs
- **GIVEN** managed local runtime state includes runtime info
- **AND** `versionTag` differs from the resolved target SkillRunner release tag
- **WHEN** one-click local runtime preparation runs
- **THEN** the plugin SHALL select deployment instead of reusing the existing runtime.
