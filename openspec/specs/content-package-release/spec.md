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

### Requirement: Feed 分支保留未选频道

系统 SHALL 在更新 `content-feed` 分支时仅替换所选频道的 `feed.json`，并保留未选频道的 feed 及其他分支内容。

#### Scenario: 更新单个频道 feed

- **WHEN** 发布仅包含 stable
- **THEN** stable feed 被更新，beta 和 dev feed 保持不变

#### Scenario: 并发发布请求

- **WHEN** 多个 Content Package 发布请求将写入同一 feed 分支
- **THEN** 系统按顺序执行它们，且不会取消已开始的发布请求

### Requirement: 既有频道安全语义保持不变

系统 SHALL 保持 dev 频道的 debug 内容规则、GitHub Release asset 的不可变校验和规则以及 Host Bridge 完成 receipt 门禁。

#### Scenario: 发布 dev 内容

- **WHEN** 发布选择包含 dev
- **THEN** dev 包含 debug-only 内容，其他所选频道不包含该内容

#### Scenario: 同名 asset 内容不同

- **WHEN** 发布尝试上传与既有 GitHub Release asset 同名但 SHA-256 不同的文件
- **THEN** 系统拒绝发布该 asset
