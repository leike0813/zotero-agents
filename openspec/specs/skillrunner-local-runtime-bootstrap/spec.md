# skillrunner-local-runtime-bootstrap Specification

## Purpose
TBD - created by archiving change add-skillrunner-oneclick-local-deploy. Update Purpose after archive.
## Requirements
### Requirement: Plugin SHALL Provide One-Click Local SkillRunner Bootstrap In Preferences
插件 MUST 在 Preferences 提供独立的 SkillRunner Local Runtime 区域，支持本地模式一键部署与诊断操作。

#### Scenario: Deploy and configure managed local profile successfully
- **WHEN** 用户在 Preferences 点击 `Deploy & Configure`
- **THEN** 插件 SHALL 顺序执行 `release download/checksum/extract -> ctl bootstrap -> read bootstrap report -> ctl up(local, host=127.0.0.1, requested_port=29813, port_fallback_span=10) -> ctl status`
- **AND** 成功后插件 SHALL 自动创建托管 backend profile `local-skillrunner-backend`，并以 `up/status` 返回的实际 `host/port/url` 作为 profile `baseUrl` SSOT
- **AND** 插件 MUST 记录下载/校验/解包证据以支持排障

#### Scenario: Reference directory is not executable runtime dependency
- **WHEN** 插件执行本地一键部署
- **THEN** 插件 MUST NOT 调用 `references/Skill-Runner/scripts/*` 作为执行入口
- **AND** `references/Skill-Runner` 仅作为文档与参考源码

#### Scenario: Deploy requires bootstrap report contract
- **WHEN** `ctl bootstrap` 成功但响应缺失 `details.bootstrap_report_file`，或该路径文件不存在/不可解析
- **THEN** 插件 SHALL 以 `deploy-bootstrap-report` 阶段失败返回
- **AND** 插件 MUST NOT 继续执行 `ctl up`

#### Scenario: Deploy continues with warning on bootstrap partial failure
- **WHEN** bootstrap report 的 `summary.outcome=partial_failure`
- **THEN** 插件 SHALL 继续执行 `ctl up` 与 `ctl status`
- **AND** 最终结果 SHALL 标记成功但附带告警摘要（含 failed engines）

#### Scenario: Deploy fails fast when release install proof is incomplete
- **WHEN** 下载、校验或解包任一步骤失败，或解包后缺少 `installDir/ctl/server`
- **THEN** 插件 SHALL 直接失败并返回对应部署阶段错误
- **AND** 插件 MUST 输出可见证据（URL、文件路径、checksum expected/actual、解包命令）

#### Scenario: Deploy flow uses plugin-managed execution only
- **WHEN** 用户触发 `Deploy & Configure`
- **THEN** 插件 MUST NOT 尝试拉起外部调试终端窗口
- **AND** 插件 SHALL 仅通过插件内命令桥接执行 installer/ctl 链路

#### Scenario: Failure fallback provides manual deploy commands
- **WHEN** 一键部署失败或用户需要手工复现
- **THEN** 插件 SHALL 提供可复制的手动命令序列（install/bootstrap/up/status/doctor）
- **AND** 命令序列 SHALL 与当前版本、默认请求端口 `29813`、`port-fallback-span=10` 和安装目录保持一致

#### Scenario: Deploy chain must not patch backend source code
- **WHEN** `release install`、`ctl bootstrap` 或 `ctl up` 任一步失败
- **THEN** 插件 SHALL 暴露失败信息用于排障
- **AND** 插件 MUST NOT 修改已安装 Skill-Runner 发布目录中的后端源码文件

#### Scenario: Profile id conflict blocks auto-write
- **WHEN** 插件检测到 `local-skillrunner-backend` 已存在且不属于托管 profile
- **THEN** 插件 MUST 提示人工处理冲突
- **AND** 插件 MUST NOT 覆盖或重命名现有 profile

#### Scenario: Historical deployed profile is not auto-migrated before redeploy
- **WHEN** 用户已有历史配置（例如 `baseUrl` 指向 `127.0.0.1:8000`）且未重新执行 Deploy
- **THEN** 插件 SHALL 继续按历史配置运行 ensure/status/up
- **AND** 插件 SHALL NOT 在启动时自动改写为新默认端口策略

#### Scenario: Uninstall clears managed profile and runtime state
- **WHEN** 用户在 Preferences 点击 `Uninstall` 且卸载脚本成功返回
- **THEN** 插件 SHALL 删除托管 profile `local-skillrunner-backend`
- **AND** 插件 SHALL 清空托管运行状态（deployment/runtime/lease）
- **AND** 插件 SHOULD 默认不清理 data/agent-home（除非显式请求）

### Requirement: Managed Local Runtime SHALL Use On-Demand Keepalive Lease Lifecycle
插件托管本地 profile MUST 在首次使用时接管 local runtime lease，并在插件生命周期内维持心跳。

#### Scenario: Managed backend execution ensures runtime and acquires lease
- **WHEN** 托管 `local-skillrunner-backend` backend 被用于 SkillRunner 执行
- **THEN** 插件 SHALL 先 ensure runtime `running`（必要时执行 `up --mode local`）
- **AND** 插件 SHALL acquire lease（请求体包含 `owner_id` 与 `metadata`）
- **AND** 插件 SHALL 使用 acquire 响应中的 `heartbeat_interval_seconds` 作为心跳周期（回退默认 20s）

#### Scenario: Heartbeat 404 triggers lease reacquire
- **WHEN** heartbeat 返回 404
- **THEN** 插件 SHALL 自动重试 acquire lease

#### Scenario: Heartbeat and release send lease_id payload
- **WHEN** 插件执行 heartbeat 或 release
- **THEN** 请求体 SHALL 包含 `lease_id`
- **AND** 插件 MUST NOT 发送空请求体替代 `lease_id`

#### Scenario: Lease 409 stops lease loop without hard crash
- **WHEN** acquire 或 heartbeat 返回 409
- **THEN** 插件 SHALL 停止 lease 循环并记录告警
- **AND** 插件 SHALL NOT 因此直接中断任务执行

#### Scenario: Plugin shutdown releases lease without auto-down
- **WHEN** 插件进入 shutdown
- **THEN** 插件 SHALL 调用 lease release
- **AND** 插件 SHALL NOT 自动执行 `down --mode local`

### Requirement: Bootstrap Capability SHALL Defer Runtime Action Semantics to State Machine SSOT
`skillrunner-local-runtime-bootstrap` MUST 将本地运行时动作语义委托给 `skillrunner-local-runtime-state-machine-ssot`，避免重复定义或冲突定义。

#### Scenario: Runtime action contract source
- **WHEN** bootstrap 入口触发 deploy/start/stop/uninstall 相关动作
- **THEN** 动作可用性、状态切换、监测收敛规则 SHALL 以 `skillrunner-local-runtime-state-machine-ssot` 为准

#### Scenario: No duplicated state rules in bootstrap spec
- **WHEN** 维护 bootstrap spec 的运行时行为描述
- **THEN** bootstrap spec SHALL 仅保留入口链路与能力边界
- **AND** SHALL NOT 复制状态机转移矩阵或按钮门禁细则
