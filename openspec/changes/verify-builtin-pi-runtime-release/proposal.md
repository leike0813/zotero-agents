# Proposal

## Why

C01–C19 已交付 Pi 执行能力，但定向测试不能证明完整候选通过安装升级、兼容矩阵、容量和真实服务验收。C20 按 [#58 规划地图](https://github.com/leike0813/zotero-agents/issues/58) 与 [#68 完整交接决议](https://github.com/leike0813/zotero-agents/issues/68#issuecomment-5967268824)，验收包含匹配 Pi core/ai 1.0.0、独立模型目录及官方 Sign in with ChatGPT 的完整候选，沿用 #26 的验收工具与其它门槛。

## What Changes

- 固定用户指定的 `dev@9218f30899e47d6e9b852dec978be81b1f802c2f` 为 v0.9.0 升级基线，记录本地基线 XPI 的摘要与来源；候选属于 v0.10.0 开发线。
- 复用兼容矩阵、正式 XPI worker 和 full E2E runner，补齐 Pi 五组行为与安装/升级路径。
- 将固定 XPI 的目录 A→B、活动 turn 冻结、官方 HTTP、缓存恢复/账户隔离与合成旧 Codex 清理纳入每个必需宿主的结构化证据；SIWC 替换旧 Codex 人工 inventory，要求登录/发现/文本/工具续调用/实际终态与用量/搜索引用。
- 保留三个已完成实施 change 的阶段验证及 C20 历史尝试作回归参考；新候选重新采集正式安装、性能、包体和服务证据，不转绑旧候选或临时 add-on 的通过记录。
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
