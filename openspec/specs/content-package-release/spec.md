# content-package-release Specification

## Purpose
定义 Content Package 维护者如何选择 stable、beta 与 dev 发布频道，并在不影响未选频道的前提下完成正式发布与验证。
## Requirements

### Requirement: 正式发布必须显式选择频道

系统 SHALL 要求每次正式 Content Package 发布指定一个由 stable、beta、dev 组成的非空频道集合，并以稳定的规范顺序处理该集合。

#### Scenario: 发布单个频道

- **WHEN** 维护者为正式发布选择 `stable`
- **THEN** 发布仅处理 stable 频道

#### Scenario: 发布多个频道

- **WHEN** 维护者为正式发布选择 `dev,beta`
- **THEN** 系统以 `beta,dev` 作为规范化后的发布集合

#### Scenario: 缺少或包含未知频道

- **WHEN** 正式发布未提供频道选择或选择包含空值、未知频道
- **THEN** 系统在创建发布前拒绝该请求

### Requirement: 选择范围限定正式发布产物

系统 SHALL 仅为所选频道构建和上传 Content Package ZIP、校验和及 feed，并将同一范围用于发布后的端到端验证。

#### Scenario: 分频道发布

- **WHEN** 维护者选择 beta 频道
- **THEN** GitHub Release 仅接收 beta ZIP 及其校验和，验证仅检查 beta feed 和 beta assets

#### Scenario: 全频道发布

- **WHEN** 维护者选择 stable、beta、dev 三个频道
- **THEN** 系统为三个频道分别发布和验证产物

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
