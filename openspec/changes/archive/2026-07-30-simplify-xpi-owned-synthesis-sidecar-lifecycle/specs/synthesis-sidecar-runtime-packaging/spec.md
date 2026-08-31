## MODIFIED Requirements

### Requirement: Formal runtime inventory SHALL be native-only

The XPI SHALL contain exactly one native Synthesis sidecar bundle per supported
target. The plugin SHALL verify the selected packaged manifest and its complete
file table before execution. Bundle provenance SHALL remain release evidence
and SHALL NOT create an independent runtime update channel.

#### Scenario: Packaged runtime is valid
- **WHEN** the current target bundle and every declared file match the XPI manifest
- **THEN** the plugin may materialize and launch that bundle

#### Scenario: Packaged runtime is invalid
- **WHEN** a declared file is missing, has the wrong size or hash, or targets another platform
- **THEN** startup fails before launching a sidecar

### Requirement: Runtime installation SHALL retain admission-pinned generations

The plugin SHALL materialize only the current XPI bundle at one fixed
installation directory. Matching verified content SHALL be reused. Changed
content SHALL replace the fixed installation only after sibling staging
verification succeeds. The installer SHALL NOT expose candidate resolution,
active/previous pointers, generation pinning, or rollback.

#### Scenario: Same XPI starts again
- **WHEN** the fixed installation matches the packaged manifest and files
- **THEN** the plugin reuses it without creating another installed version

#### Scenario: XPI bundle changes
- **WHEN** verified packaged content differs from the fixed installation
- **THEN** the plugin stages, verifies, and atomically replaces the fixed installation

#### Scenario: Replacement fails
- **WHEN** staging, verification, or replacement fails
- **THEN** the prior fixed installation remains intact and no sidecar launches
