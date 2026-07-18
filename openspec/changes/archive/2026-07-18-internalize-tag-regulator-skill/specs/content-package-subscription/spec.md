## ADDED Requirements

### Requirement: Official content packaging SHALL collect repository-owned Tag Regulator skill files
The official content package builder MUST collect the repository-owned `skills_builtin/tag-regulator` directory as skill id `tag-regulator` without depending on Git submodule initialization or changing the installed package layout.

#### Scenario: Official content package is assembled
- **WHEN** tracked builtin workflows and skills are collected for packaging
- **THEN** the package SHALL contain the Tag Regulator `SKILL.md`, references, scripts, schemas, and runner metadata at the existing skill path
- **AND** Tag Regulator SHALL NOT be added to the independently published public skill list
