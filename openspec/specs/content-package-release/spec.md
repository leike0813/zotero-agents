# content-package-release Specification

## Purpose
定义 Content Package 维护者如何按 main 与 dev 发布线选择频道，并在不影响未选频道的前提下完成正式发布与验证。
## Requirements

### Requirement: 正式发布必须显式选择频道

系统 SHALL 要求每次正式 Content Package 发布显式指定非空频道集合，并以稳定的规范顺序处理该集合。

#### Scenario: 发布单个频道

- **WHEN** 维护者从 main 为正式发布选择 `stable`
- **THEN** 发布仅处理 stable 频道

#### Scenario: 发布多个频道

- **WHEN** 维护者从 main 为正式发布选择 `beta,stable`
- **THEN** 系统以 `stable,beta` 作为规范化后的发布集合

#### Scenario: 缺少或包含未知频道

- **WHEN** 正式发布未提供频道选择或选择包含空值、未知频道
- **THEN** 系统在创建发布前拒绝该请求

### Requirement: 发布线必须与频道隔离

系统 SHALL 仅允许 main 发布 stable、beta 或二者组合，仅允许 dev 发布 dev；其他 ref 或跨发布线频道组合必须在执行任何 Git 或 GitHub 命令前被拒绝。

#### Scenario: main 发布正式频道

- **WHEN** main 请求发布 stable、beta 或二者组合
- **THEN** 系统接受该发布范围

#### Scenario: dev 发布开发频道

- **WHEN** dev 请求仅发布 dev
- **THEN** 系统接受该发布范围

#### Scenario: 发布范围串线

- **WHEN** main 请求 dev、dev 请求 stable 或 beta、或其他 ref 请求任意频道
- **THEN** 系统在构建、上传或执行发布命令前拒绝请求

### Requirement: 选择范围限定正式发布产物

系统 SHALL 仅为所选频道构建和上传 Content Package ZIP、校验和及 feed，并将同一范围用于发布后的端到端验证。

#### Scenario: 分频道发布

- **WHEN** 维护者选择 beta 频道
- **THEN** GitHub Release 仅接收 beta ZIP 及其校验和，验证仅检查 beta feed 和 beta assets

#### Scenario: dev 频道发布

- **WHEN** 维护者从 dev 选择 dev 频道
- **THEN** 系统仅发布和验证 dev 产物

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

### Requirement: Feed 分支保留未选频道

系统 SHALL 在更新 `content-feed` 分支时仅替换所选频道的 `feed.json`，并保留未选频道的 feed 及其他分支内容。

#### Scenario: 更新单个频道 feed

- **WHEN** 发布仅包含 stable
- **THEN** stable feed 被更新，beta 和 dev feed 保持不变

#### Scenario: 并发发布请求

- **WHEN** 多个 Content Package 发布请求将写入同一 feed 分支
- **THEN** 系统按顺序执行它们，且不会取消已开始的发布请求

### Requirement: 既有频道安全语义保持不变

系统 SHALL 保持 dev 频道的 debug 内容规则以及 GitHub Release asset 的不可变校验和规则。

#### Scenario: 发布 dev 内容

- **WHEN** 发布选择包含 dev
- **THEN** dev 包含 debug-only 内容，其他所选频道不包含该内容

#### Scenario: 同名 asset 内容不同

- **WHEN** 发布尝试上传与既有 GitHub Release asset 同名但 SHA-256 不同的文件
- **THEN** 系统拒绝发布该 asset

### Requirement: Content Package archives SHALL exclude plugin-owned Host Bridge Skills

Stable, beta, and development Content Package archives SHALL contain no Skill whose ID belongs to the Host Bridge surface closure. The generic package collector SHALL continue to include other repository-owned Skills and Workflows without a Host Bridge-specific exclusion list.

#### Scenario: Any channel archive is built

- **WHEN** a Content Package archive is built for stable, beta, or development delivery
- **THEN** it contains zero reserved Host Bridge Skills
- **AND** it still contains representative non-reserved Skills and Workflows

### Requirement: Content Package publication SHALL be independent of Host Bridge receipts

Preparing or publishing a Content Package SHALL not require a Host Bridge complete receipt because the package no longer owns Host Bridge CLI-coupled Skills.

#### Scenario: Content publication has no matching Host Bridge receipt

- **WHEN** an otherwise valid Content Package release is prepared without a matching Host Bridge complete receipt
- **THEN** Host Bridge receipt state does not block Content Package preparation or publication

### Requirement: Content mirror synchronization SHALL support content-only scope

The synchronization command SHALL support a content-only scope that copies the selected published GitHub content release without synchronizing plugin refs, XPI assets or plugin update metadata.

#### Scenario: Content-only synchronization is requested

- **WHEN** the maintainer selects content-only and version 0.8.8
- **THEN** only the corresponding content release and content-feed mirror SHALL be synchronized

### Requirement: Mirror assets SHALL follow published channel inventory

The mirror synchronizer SHALL validate complete ZIP/checksum pairs for the channels actually present in the selected GitHub release, copy immutable source bytes and verify mirror bytes. It SHALL advance the feed only after successful asset verification.

#### Scenario: Only dev was published

- **WHEN** the source release contains only dev ZIP and checksum
- **THEN** synchronization SHALL accept that complete pair without requiring stable or beta

#### Scenario: A published asset pair is incomplete

- **WHEN** a ZIP or matching checksum is absent or the checksum disagrees
- **THEN** synchronization SHALL fail before uploading assets or advancing the feed

#### Scenario: Existing mirror asset matches or conflicts

- **WHEN** the mirror has a same-name asset
- **THEN** identical bytes SHALL be reused and different bytes SHALL fail without replacement

#### Scenario: Feed or tag cannot be synchronized safely

- **WHEN** the mirror feed cannot fast-forward or a same-name tag identifies a different commit
- **THEN** synchronization SHALL fail without force-pushing refs

#### Scenario: Mirror synchronization completes

- **WHEN** all source assets have been mirrored
- **THEN** public download URLs, sizes, hashes and checksum assets SHALL match the source feed and the mirrored content-feed ref SHALL match the captured GitHub ref

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
