# literature-workbench-workflows Delta

## ADDED Requirements

### Requirement: Literature digest automatic tag branch

`literature-digest` SHALL support an optional ACP-only automatic tag-regulator
branch.

#### Scenario: Automatic tag disabled

- **GIVEN** `auto_tag_regulator` is false
- **WHEN** literature-digest builds its request
- **THEN** it emits a one-step `skillrunner.sequence.v1` request that only runs
  the literature-digest skill.

#### Scenario: Automatic tag enabled

- **GIVEN** `auto_tag_regulator` is true
- **WHEN** literature-digest builds its request
- **THEN** it emits a two-step sequence that runs literature-digest and then
  tag-regulator in a reused workflow workspace.

#### Scenario: Combined apply

- **GIVEN** the two-step sequence succeeds
- **WHEN** literature-digest applyResult runs
- **THEN** it applies the digest result and then the tag-regulator result and
  returns a combined summary.
