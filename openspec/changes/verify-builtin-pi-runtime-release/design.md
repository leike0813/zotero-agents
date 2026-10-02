# Design

## Context

采用 [#26 C20 accepted plan](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5551922404)。用户已明确将当前 dev HEAD 固定为 v0.9.0 基线，取代已发布 GitHub artifact 的前提。当前实现 HEAD 为 `76d30839`，C19 已归档。

## Goals / Non-Goals

用现有 receipt 和 runner 完成可重跑的候选验收；外部服务、平台、清理和实际效果都必须有证据。发布、提交、分支切换和依赖安装不在本次执行范围。

## Decisions

- **一个候选身份**：source commit、dirty、XPI SHA-256、版本和选定容量。正式证据要求 clean source；开发证据可收集但不能成为发布通过。目录或摘要文件不能代替实际 artifact 字节。
- **薄聚合**：兼容证据读取现有 `zotero-agents.zotero-compatibility-receipt.v1`，其余新增证据仅承载缺失的度量和人工确认。通过状态和 blocking 独立，必需项不能用 not_applicable 消失。所有尝试保留，最新有效尝试决定状态，错误候选不得覆盖匹配结果。
- **矩阵 SSOT**：`tests/zotero/compatibility-matrix.json` 决定目标和 blocking；C20 自身完整 Pi 验收不得以未晋升的通用 E2E 单元自动豁免。保留现有通用矩阵晋升流程。
- **升级基线**：从固定 dev commit 导出到临时目录，复用已有依赖和构建工具，本地 v0.9.0 XPI 保存 SHA-256；先在独立 profile 运行旧插件创建受控 ACP/SkillRunner 配置和历史，再安装候选验证数据。
- **构建控制**：只用于测量的编译期 Pi 注册排除与容量探索；正常构建始终启用 Pi。正式候选拒绝测量控制。原浏览器 builtin guard 保持精确。
- **目录与预算**：保留完整内置模型目录。用户决定修订大小规格：raw 增量上限为 20 MiB，gzip 为 1.5 MiB，XPI 为 2 MiB。完整目录的开发测量 raw 约 15.57 MiB、gzip/XPI 均不足 1 MiB，raw 上限留有约 4.43 MiB 余量。测量脚本与验收器共用 `src/config/piRuntimeBuild.ts` 的预算；仅超过修订后的任一上限时需要候选绑定的人工例外。旧测量及失败记录保留，clean 最终候选按新预算重新测量。
- **容量**：4/6/8/12 在 Windows/Linux Zotero 10 实测后选两平台共同通过的最高值，后台总数减二。未取得证据前保留现有 12，不伪造选择。60 秒预热、60 秒 idle、15 分钟负载、120 秒 settle，禁止强制 GC。
- **lane 归属**：用户批准新 Auto Skill Run 进入 background；模式在 admission 固定，Auto 的继续仍属 background。Conversation/Interactive 使用 foreground，安全启动续跑保持 background。统一在 Skill Run turn 的既有准入点选择 lane，复用生命周期的总量、后台上限、前台预留及 FIFO；测试通过实际 dispatch 与容量观察验证，不能改写 lane。
- **报告与门禁**：JSON/Markdown 投影仅输出安全身份、结构化数值和相对 artifact 引用。现有 coordinator 同时保留 Node full/lint、Host Bridge 和 content gates。候选变化使证据失效，文档/归档复用必须明确证明 XPI 和测试定义均不变。

## Files

- 新增聚合入口及专用 tooling test；修改现有 release gate 与其测试，package commands。
- 构建配置和最少 Pi composition 入口支持大小对照；新增 measurement script/test。
- 修改 compatibility fixture/matrix/worker、XPI suite、现有 mock 生命周期、family catalog；新增 full Pi 行为用例。
- 修改 lifecycle 常量测试与 performance digest，新增现有 runner 内的容量用例。
- 修改 `piSkillRun.ts` 的统一 lane 选择，扩展既有 owner/lifecycle 行为测试；补充 `pi-runtime-lifecycle` delta 和项目准入约束。
- 新增 `docs/dev/pi-runtime-acceptance.md`，更新交接与 verification；不复制整个迁移测试体系。

## Risks / Trade-offs

- Windows/macOS 和真实账号可能不可用 → 完整保留 missing/failed，继续完成可执行基础设施及本机检查。
- 工作区未提交 → 开发证据不能冒充 clean final candidate；不能擅自提交以越过门禁。
- 严格排除注册影响 shared imports → 真实控制构建测量导入图，禁止深层任意 stub。

## Migration Plan

候选测试使用隔离 profile；用户数据与每日 profile 不参与。发布交给另行授权的现有流程；回滚用更高 patch 保留 Pi 数据，禁止破坏性降迁移。
