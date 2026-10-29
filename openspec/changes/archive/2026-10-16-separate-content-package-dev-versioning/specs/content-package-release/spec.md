# Spec Delta

## ADDED Requirements

### Requirement: 开发频道版本独立于正式频道

Content Package SHALL 为 stable/beta 共用正式 SemVer 版本，为 dev 单独保存 `X.Y.Z-dev.N` 版本。开发迭代 SHALL 只递增开发计数，正式 bump SHALL 不修改开发版本。构包、ZIP manifest、feed、发布标签和发布后校验 SHALL 使用对应频道版本，且保留不可变资产规则。

#### Scenario: 多次开发发布后准备正式发布

- **WHEN** dev 从 `0.8.10-dev.0` 迭代至 `0.8.10-dev.20`
- **THEN** stable/beta 的正式版本保持不变，下一次正式 bump 按正式版本计算

#### Scenario: 旧开发版本迁移

- **WHEN** 已安装的 dev 版本为 `0.8.9`
- **THEN** 首个独立 dev 版本 `0.8.10-dev.0` 可按既有 SemVer 更新规则升级
- **AND** 切换到较低正式版本仍沿用既有 feed-directed rollback 行为

#### Scenario: 开发版本不合法

- **WHEN** dev 版本缺失、不是 `X.Y.Z-dev.N`，或 bump 不严格递增
- **THEN** 构包或版本修改 SHALL 失败且不发布产物、不写入无效版本

#### Scenario: 构建多个频道

- **WHEN** 一次本地构建选择 stable、beta、dev
- **THEN** stable/beta 使用正式版本，dev 使用独立开发版本，各自 ZIP 与 feed 的版本和 URL 一致

### Requirement: 构建预检按当前分支验证已发布内容

插件 build-preflight SHALL 在内置内容生成物同步后核对 GitHub 内容发布。main SHALL 检查 stable 与 beta；分支名以 dev 开头 SHALL 检查 dev。其他分支或 detached HEAD SHALL 报告无法自动确定检查范围并阻止准备完成。此检查范围 SHALL 不扩大发布权限。

#### Scenario: main 或开发分支预检

- **WHEN** 在 main、dev、dev-feature 或 dev/feature 执行预检
- **THEN** main 仅检查 stable/beta，其余仅检查 dev

#### Scenario: 未知分支

- **WHEN** 在 feature/example 或 detached HEAD 执行自动分支检查
- **THEN** 检查 SHALL 失败并说明需要明确范围，不能默认为正式频道

### Requirement: 内容 freshness 由当前交付字节与远端证据决定

检查 SHALL 针对每个所选频道，使用该频道远端发布的 revision 和时间重建当前工作区内容，核对版本、内容身份、ZIP 大小、SHA-256 及远端 checksum。无关 HEAD 变化 SHALL 不导致 stale。内容变化 SHALL 报 stale；网络、缺失或无效证据 SHALL 不被当作 fresh。检查 SHALL 仅写隔离临时输出。

#### Scenario: 忘记发布内容修改

- **WHEN** 已发布版本号未变而当前被打包的 Skill 或 Workflow 内容变化
- **THEN** 检查 SHALL 失败，预检 SHALL 停止 build 并提供 bump、发布、复验步骤
- **AND** 普通 build 请求 SHALL 不自动授权远端发布

#### Scenario: 频道发布身份不同

- **WHEN** stable 与 beta 在不同 revision 或时间发布且内容均与当前工作区一致
- **THEN** 各频道 SHALL 按自己的身份重建并通过检查

#### Scenario: 发布产物不可取得或损坏

- **WHEN** feed、ZIP 或 checksum 无法取得或校验不符
- **THEN** 预检 SHALL 保留诊断并停止 build

#### Scenario: 内容未变而 HEAD 变化

- **WHEN** 当前 HEAD 改变但所选频道交付内容未变
- **THEN** 检查 SHALL 可依据已有远端发布元数据和相同交付字节通过
