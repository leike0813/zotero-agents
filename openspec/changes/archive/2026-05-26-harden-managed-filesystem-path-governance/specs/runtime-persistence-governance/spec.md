## ADDED Requirements

### Requirement: Managed relative paths are governed

Runtime persistence SHALL provide a managed relative path policy for
plugin-generated paths under managed roots.

#### Scenario: Unsafe relative path is rejected

- **WHEN** a managed relative path contains traversal, an absolute path form, a
  reserved device name, a trailing dot or space, illegal characters, an
  over-budget segment, or an over-budget relative path
- **THEN** validation SHALL fail with a structured path diagnostic code.

#### Scenario: Case collision is rejected

- **WHEN** two managed relative paths in the same directory differ only by case
- **THEN** validation SHALL fail with `managed_path_case_collision`.

### Requirement: Long absolute managed paths are diagnostic warnings

Managed absolute path length SHALL be reported but not rejected by default.

#### Scenario: User root is long

- **WHEN** a user-selected managed root is long but the managed relative path is
  valid and short
- **THEN** the plugin SHALL NOT reject the path solely due to absolute length
- **AND** it MAY report `managed_absolute_path_long` as a warning diagnostic.

### Requirement: Integrity scan reports path policy issues

Persistence integrity scans SHALL report path-policy issues for managed plugin
assets.

#### Scenario: Managed asset violates policy

- **WHEN** a managed file under plugin-owned roots has a reserved name, case
  collision, legacy long canonical filename, or over-budget relative path
- **THEN** the integrity report SHALL include a non-cleanable diagnostic issue.
