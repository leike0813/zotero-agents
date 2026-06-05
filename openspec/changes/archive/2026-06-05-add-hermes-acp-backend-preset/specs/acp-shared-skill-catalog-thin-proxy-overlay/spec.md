## ADDED Requirements

### Requirement: ACP runner SHALL maintain a shared skill catalog

ACP SkillRunner-compatible runs MUST build or reuse a shared read-only catalog
of effective plugin-side skills.

#### Scenario: Hermes uses shared catalog without proxy overlay

- **GIVEN** the resolved ACP agent family is `hermes`
- **WHEN** the shared catalog is built or reused
- **THEN** the catalog entries SHALL include the source skill ID, description,
  catalog skill root, and `SKILL.md` path
- **AND** the runner SHALL NOT create run-local thin proxy skill directories
  for Hermes.

### Requirement: ACP runner SHALL materialize thin proxy skills for proxy-based families

ACP SkillRunner-compatible runs MUST inject run-local thin proxy skills for all
effective catalog skills for families that use project-level skill roots.

#### Scenario: Non-Hermes proxy materialization is preserved

- **GIVEN** the resolved ACP agent family is not `hermes`
- **WHEN** ACP Skills prepares a run
- **THEN** the runner SHALL materialize thin proxy skills into the resolved
  skill roots as before.
