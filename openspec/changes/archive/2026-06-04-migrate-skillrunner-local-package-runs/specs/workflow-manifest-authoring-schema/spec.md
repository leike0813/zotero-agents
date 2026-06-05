## MODIFIED Requirements

### Requirement: Schema contract SHALL align with current loader-visible constraints
系统 MUST 使用单一 schema 校验 workflow manifest，确保作者声明与运行时消费一致。

#### Scenario: declarative skillrunner request defaults to local package source
- **WHEN** workflow uses declarative `request.kind=skillrunner.job.v1` and declares `request.create.skill_id`
- **AND** `request.create.skill_source` is omitted
- **THEN** manifest schema validation SHALL accept the manifest
- **AND** compiler output SHALL use `skill_source="local-package"`

#### Scenario: author selects installed skillrunner source
- **WHEN** workflow uses declarative `request.kind=skillrunner.job.v1`
- **AND** `request.create.skill_source` is `"installed"`
- **THEN** manifest schema validation SHALL accept the manifest
- **AND** compiler output SHALL preserve `skill_source="installed"`

#### Scenario: invalid skillrunner source is rejected
- **WHEN** workflow declares `request.create.skill_source` with a value other than `"local-package"` or `"installed"`
- **THEN** manifest schema validation SHALL reject the manifest with deterministic diagnostics
