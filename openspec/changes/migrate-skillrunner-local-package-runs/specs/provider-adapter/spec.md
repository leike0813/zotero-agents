## MODIFIED Requirements

### Requirement: 系统必须对 Provider Request Contract 做统一校验
系统 MUST 在 runtime/provider dispatch 过程中复用同一套 Provider Request Contract 校验规则，保证请求类型、后端类型和请求负载约束一致。

#### Scenario: skillrunner local-package payload remains valid provider input
- **WHEN** `skillrunner.job.v1` payload carries `skill_source="local-package"` and a non-empty `skill_id`
- **THEN** provider contract validation SHALL accept the payload
- **AND** `skill_id` SHALL be treated as the plugin-side skill lookup key before backend dispatch

#### Scenario: skillrunner installed payload remains valid provider input
- **WHEN** `skillrunner.job.v1` payload carries `skill_source="installed"` and a non-empty `skill_id`
- **THEN** provider contract validation SHALL accept the payload
- **AND** provider execution SHALL preserve the installed-skill backend route

### Requirement: Provider 执行结果必须统一为标准模型
系统 MUST 将不同 Provider 的执行输出归一为统一结果结构，供 runtime 与 `applyResult` 消费。

#### Scenario: local-package skillrunner job uses temp-upload backend source
- **WHEN** request kind is `skillrunner.job.v1` and `skill_source` is missing or `"local-package"`
- **THEN** provider execution SHALL create the backend run with `skill_source="temp_upload"`
- **AND** the create request SHALL NOT include `skill_id`
- **AND** provider execution SHALL upload the resolved local skill package as multipart field `skill_package`
- **AND** provider execution SHALL continue polling and fetching through `/v1/jobs/{request_id}` endpoints

#### Scenario: local-package input files upload with skill package
- **WHEN** a local-package SkillRunner request has non-empty `upload_files`
- **THEN** provider execution SHALL include the input zip as multipart field `file` in the same upload request as `skill_package`
- **AND** existing upload-relative input path mapping SHALL remain unchanged

#### Scenario: explicit installed source preserves legacy route
- **WHEN** request kind is `skillrunner.job.v1` and `skill_source="installed"`
- **THEN** provider execution SHALL send `skill_id` in the `/v1/jobs` create body
- **AND** provider execution SHALL NOT upload a `skill_package`
