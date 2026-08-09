## MODIFIED Requirements

### Requirement: Node runtime SHALL be a development-only oracle after R8

The transitional development-only Node oracle allowance SHALL end when R9b
completes. The repository source graph, workspaces, scripts, tests, workflows,
runtime manifests, installation, supervision, package/XPI inventory,
active/previous pointers, fallback routing, and release assets MUST contain no
Node Synthesis service, JavaScript worker implementation, or mechanism that can
restore one. Historical source remains available only through version control,
not a tracked deprecated copy.

#### Scenario: Node oracle remains in the repository
- **WHEN** build and source inventories inspect retained Node application code
- **THEN** no retained Node application code remains after R9b
- **AND** production runtime readiness SHALL accept only `rust-native`

#### Scenario: R9b source and build inventories run
- **WHEN** repository, workspace, script, workflow, test, package, and runtime artifacts are inspected
- **THEN** no executable Node Synthesis service or JavaScript worker remains
- **AND** production/runtime readiness accepts only the verified `rust-native` implementation

#### Scenario: A Node re-enable path is introduced
- **WHEN** a manifest field, environment variable, preference, backend registration, script, dynamic import, or fallback attempts to select Node
- **THEN** the source/build boundary gate fails
