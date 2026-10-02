# Proposal

## Why

C01–C19 已交付 Pi 执行能力，但定向测试不能证明完整候选通过安装升级、兼容矩阵、容量和真实服务验收。C20 把 #26 的验收决议落实为可运行的证据收集与发布门禁。

## What Changes

- 固定用户指定的 `dev@9218f30899e47d6e9b852dec978be81b1f802c2f` 为 v0.9.0 升级基线，记录本地基线 XPI 的摘要与来源；候选属于 v0.10.0 开发线。
- 复用兼容矩阵、正式 XPI worker 和 full E2E runner，补齐 Pi 五组行为与安装/升级路径。
- 测量相同源码/锁文件/设置下排除 Pi 注册的控制构建与正式构建差值，补齐真实宿主容量测量。
- 保留完整模型目录，将 raw 增量预算设为 20 MiB，gzip/XPI 预算保持 1.5/2 MiB；超过新预算时仍需候选绑定的人工例外。
- 将 Auto Skill Run 准入 background lane，Conversation/Interactive 保持 foreground，安全启动续跑保持 background；在生产准入边界验证后台上限和前台预留。
- 汇总候选绑定的兼容、大小、性能与人工 receipt，保留失败和重跑，通过现有 release coordinator 阻止缺证据的发布。
- 更新验收 runbook 与持续交接，实际外部证据未通过前不宣告 C20 完成。

## Capabilities

### New Capabilities

- `pi-runtime-release-acceptance`: 候选绑定、证据完整性、bundle 预算、容量选择与人工验收。

### Modified Capabilities

- `zotero-cross-platform-compatibility-fixture`: Pi 正式安装升级路径和五组行为矩阵证据。
- `zotero-test-performance-probe-contract`: 连续 event-loop/RSS 采样和固定混合负载证据。
- `pi-runtime-lifecycle`: Auto/Interactive lane 归属和后台满载时的前台预留。

## Impact

影响 `scripts/check-pi-runtime-acceptance.ts`、release coordinator、compatibility worker/fixture、系统 E2E、性能 probe、构建配置、package commands 和相关测试。无新依赖、Node CI lane、运行时用户开关或自动发布。
