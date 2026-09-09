# dashboard-management-auth Specification

## Purpose
Define how the Dashboard Host authenticates SkillRunner management requests without affecting execution-chain credentials.
## Requirements
### Requirement: Dashboard MUST support management-API Basic Auth for SkillRunner
系统 MUST 支持 Dashboard 调用 SkillRunner `/v1/management/*` 时的 Basic Auth 录入与重试。

#### Scenario: 首次访问管理 API 触发凭据采集
- **WHEN** Dashboard 首次访问某 SkillRunner backend 的管理 API 且缺少凭据
- **THEN** 系统 MUST 弹窗采集 username/password
- **AND** 系统 MUST 将凭据保存到 backend profile 的 management_auth 字段

#### Scenario: 401 时重试凭据并覆盖保存
- **WHEN** 管理 API 返回 401
- **THEN** 系统 MUST 再次弹窗采集凭据
- **AND** 新凭据 MUST 覆盖原凭据并重试请求

#### Scenario: 管理 API 凭据不影响执行链鉴权
- **WHEN** provider 执行 `skillrunner.job.v1`
- **THEN** 系统 MUST NOT 自动注入 management_auth Basic 凭据
