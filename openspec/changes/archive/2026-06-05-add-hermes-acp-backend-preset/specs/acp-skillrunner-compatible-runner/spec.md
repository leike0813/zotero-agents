## MODIFIED Requirements

### Requirement: ACP runner SHALL materialize skills into agent-specific roots

The ACP runner SHALL materialize plugin-side skills into run-local skill roots
selected by ACP agent family, except for ACP families that use catalog-based
instruction discovery.

#### Scenario: Hermes uses catalog-based skill discovery

- **GIVEN** an ACP backend resolved as `hermes`
- **WHEN** the runner prepares an ACP Skills run
- **THEN** it SHALL build or reuse the shared skill catalog
- **AND** it SHALL NOT materialize thin proxy skills into project-level skill
  roots
- **AND** it SHALL keep the requested skill's catalog root available for
  execution and validation.

### Requirement: ACP runner SHALL validate structured output and repair failures

The ACP runner SHALL validate assistant turn output and issue bounded repair
prompts when validation fails.

#### Scenario: Hermes initial prompt uses HERMES instructions

- **GIVEN** an ACP Skills run is created for a SkillRunner-compatible job
- **AND** the ACP backend resolves as `hermes`
- **WHEN** the run workspace is prepared
- **THEN** ACP Skills SHALL materialize `HERMES.md`
- **AND** `HERMES.md` SHALL identify the current requested Agent Skill
- **AND** `HERMES.md` SHALL list available Agent Skills with ID, description,
  and catalog skill root
- **AND** the first prompt SHALL include compact catalog context rather than
  proxy skill roots.
