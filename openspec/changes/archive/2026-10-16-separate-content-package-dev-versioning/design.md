# Design

## Context

动机见 proposal。当前 descriptor 的 `version` 为 0.8.9。2026-10-16 读取 GitHub feed：stable/beta 为 0.7.4，dev 为 0.8.9。发布仅允许 main → stable/beta、dev → dev。订阅端允许 feed 指定回退，并直接使用 SemVer 比较；无需修改插件运行时代码。

## Goals / Non-Goals

让开发次数与正式版本计数分离；复用现有发布检查器形成构建前证据。不增加依赖、不自动发布、不改变订阅状态或发布权限，不以全仓 HEAD 相等代替交付内容比较。

## Decisions

1. 在现有 descriptor 保留 `version`，增加 `dev_version: 0.8.10-dev.0`。dev 必须为纯 `X.Y.Z-dev.N`（非负整数）；正式字段沿用合法 SemVer，保留 beta 预发布 target。共享 Node 工具模块持有版本解析和 CLI 选择，供 builder、bump、checker 和 workflow 复用，避免 workflow 内嵌 JSON 字段选择。相比另建版本文件，这保留共同 metadata 的唯一来源。环境覆盖仍须满足目标频道版本格式；跨版本线混合选择不能用同一个覆盖版本。
2. bump 增加 `--channel stable|beta|dev`，默认 stable 保持调用兼容。dev 的 patch 表示递增 N；minor/major 要求显式选择新 dev 版本，避免隐含消费正式版本。显式 dev target 必须严格大于原 dev；正式 bump 不改 dev。`release:content-package` 增加同一单频道 bump 参数，dispatch 仍用 `--channels` 且拒绝混用。
3. 现有 checker 增加 `--current-branch`，由 git 当前分支选择 main → stable,beta、startsWith(dev) → dev；与显式 channels/include-dev 互斥。其他分支、detached HEAD 失败。无需新增 npm 命令或独立 freshness 脚本。
4. checker 按频道分别构包，每次复用该频道的远端 revision/updated_at，保持当前文件内容。现有 ZIP 规范化、tracked 输入范围、签名和资产校验继续复用。对每次隔离输出读完再检查下一频道，避免 builder 清空同一个 outRoot 后丢失前次结果。缺失 metadata 明确失败。
5. preflight 加入组件表和独立步骤，位于内置生成物同步之后、最终 build 之前。stale 要求按对应版本线 bump、提交/推送、从允许 ref 发布，再复验；这些写操作仍由明确授权控制。其他证据缺失/网络失败报告 unknown/failed，不执行无意义 bump。文档明确 freshness 证明远端发布与本地交付一致，实机仍需安装/更新对应频道。

## File Scope

- 新增 `scripts/content-package/content-package-version.ts`：共享版本解析及 workflow CLI。
- 修改 `content-package.version.json`：增加 dev_version，保留正式 version。
- 修改 `scripts/content-package/{bump-content-package-version,prepare-content-package-release,build-content-package-feed,check-content-package-release,content-package-channels}.ts`：版本线选择、dev bump、按分支检查和各频道身份重建。
- 修改 `.github/workflows/publish-content-feed.yml`：复用共享版本解析 CLI。
- 修改 `scripts/release-coordinator-gate.ts` 与其现有测试：将新增版本解析器纳入内容发布候选检查。
- 扩展 `tests/tooling/165-content-package-release-scripts.test.ts`：现有公开脚本 seam 的 TDD 测试；本地临时 fixture、HTTP 替身和真实 builder CLI 验证。
- 修改 `.agents/skills/zotero-agents-build-preflight/SKILL.md`、发布协调技能及 playbook、`AGENTS.md`：命令和证据契约。辅助发布脚本仅在实际存在版本选择缺口时调整。
- 当前 change 文档与 tasks；不删除文件，不更改已有主 specs（留待 archive）。

## Risks / Trade-offs

- 首次 dev 新版本尚未发布 → 本地真实 freshness 预期失败，记录该结果，不自动发布。
- 正式 version 保留 0.8.9，仍包含已有开发时期造成的版本跨度 → 不擅自回退已记录版本；此后开发次数不再扩大它。
- 切换 dev 至更低 stable 仍显示回退 → 保留现有允许回退契约，避免引入版本线优先级。
- main 的两个频道可能不同时更新 → 本次要求两个频道均新鲜，按各自 metadata 重建；任一与当前内容不同都阻止 build。
- 未跟踪内容文件不属于当前发布 collector 输入 → freshness 以实际交付范围为准，相关新增文件在发布前应纳入 Git；生成物同步仍由 preflight 的前序检查负责。

## Migration Plan

先用现有测试公开入口逐步红绿验证版本隔离和 freshness，再更新脚本调用方及技能。运行定向 tooling suite、静态检查和 OpenSpec strict 校验。只读调用真实 dev freshness 记录尚待发布的结果；不为该结果自动运行远端发布或插件 build。正式部署需另获提交/推送/发布授权，使用新 dev 版本发布后再执行实机准备。
