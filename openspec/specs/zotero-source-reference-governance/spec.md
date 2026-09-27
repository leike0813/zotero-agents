## Purpose

Provide repeatable, bounded Zotero source audits whose pinned baselines remain aligned with the project's tested compatibility matrix and public support claims.

## Requirements

### Requirement: Stable source baselines

The repository SHALL record Zotero 7, 9, and 10 source references as shallow submodules pinned by gitlink to reviewed stable-tag commits. A baseline update MUST select a stable tag and verify its resolved commit instead of tracking a maintenance branch head.

#### Scenario: Contributor initializes source baselines

- **WHEN** a contributor initializes the three declared Zotero source submodules
- **THEN** each worktree resolves to the recorded stable-tag commit using shallow history

#### Scenario: Maintainer updates a baseline

- **WHEN** a maintainer advances a Zotero source baseline
- **THEN** the selected revision is a verified stable tag commit and the gitlink records that exact commit

### Requirement: Reference source remains opt-in

Default repository search, indexing, formatting, linting, type checking, and CI content-submodule initialization SHALL exclude the Zotero reference worktrees. Explicit source investigations SHALL remain possible, and nested Zotero submodules MUST remain uninitialized unless an investigation requires a named nested source tree.

#### Scenario: Developer performs a default repository scan

- **WHEN** a developer or automated repository tool uses the default ignore policy
- **THEN** no file below the three Zotero reference worktrees is included

#### Scenario: Developer explicitly investigates Zotero source

- **WHEN** a developer addresses a reference worktree with an ignore-override or submodule-aware command
- **THEN** the pinned Zotero source can be read without initializing unrelated nested submodules

#### Scenario: CI initializes content submodules

- **WHEN** CI prepares content required for validation or release
- **THEN** it initializes `skills_builtin` without fetching the Zotero reference worktrees

### Requirement: Compatibility evidence stays synchronized

A Zotero source baseline change SHALL trigger review of the compatibility matrix, source-audit conclusions, test documentation, and public version statements. Compatibility SHALL be claimed only for the representative versions and evidence levels actually recorded by the project.

#### Scenario: Baseline version changes

- **WHEN** any pinned Zotero stable version changes
- **THEN** maintainers review the compatibility matrix and affected documentation in the same change and record any unchanged artifacts as intentionally retained

#### Scenario: Platform evidence is incomplete

- **WHEN** a platform or version has non-blocking or smoke-only evidence
- **THEN** public documentation does not describe that evidence as full historical or behavioral coverage
