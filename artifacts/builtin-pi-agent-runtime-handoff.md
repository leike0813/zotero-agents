# 内置 Pi Agent Runtime 工作交接

- 状态核对：2026-09-29
- 工作分支：`dev-agent-harness`
- 实施路线：[地图 #10](https://github.com/leike0813/zotero-agents/issues/10)、[执行计划 #26](https://github.com/leike0813/zotero-agents/issues/26)
- 已实现并归档：W0 C01（提交 `fbd297d4`）、W1 C02（`1da0cd84`）、W1 C03（`ef91407c`）、W1 C07（`f5ce9fe6`）、W1 C09（`5077c7b3`）、W2 C04（`f88e2825`）、W2 C06（`2bb22e90`）、W2 C08（实现 `fe6a5a51`，归档 `ad671f6f4`）、W2 C10（实现 `78023c716`、`a8602bc77`，归档 `2026-09-29`）；见 C08 归档 [C08 OpenSpec 归档](../openspec/changes/archive/2026-09-28-add-pi-trusted-native-execution/) 与 [C10 OpenSpec 归档](../openspec/changes/archive/2026-09-29-establish-pi-mcp-tool-sources/)。

本文是持续更新的工作交接。**后续每个 Pi Runtime 相关 change 完成、归档或改变实施决定时，实施者须在交接前按实际进度更新本文**：核对已实现边界、下一步、验证结果、未解决风险及链接，并更新状态日期。拟议能力不得写成已交付能力；实现与规格冲突时先核对代码和正式决策。

## 交接目标

这份文档帮助后续 change 接续已确定的产品边界和实现进度。内置 Pi Agent Runtime 最终应成为完整 Agent：支持可持久化的多轮交互、经策略中介使用 Shell、文件和网络能力，并通过稳定的插件内边界操作 Zotero 文献库。

W0 C01 已建立无 Node.js 依赖的瞬态 Pi 运行时骨架，W1 C02 已增加项目自有的 Pi owner 持久化基础，W1 C03 增加模型目录、配置、加密凭据和 Backend Manager 独立页面。W1 C07 已建立工具目录、策略和执行证据内核。W2 C04 已接入 API key Provider 模型流和手动连接测试；W2 C08 已实现原生文件、搜索和 Shell 工具目录。W2 C10 的 MCP 来源、发现和 Tool Gateway 接线已实现；Linux/Windows 宿主门禁、全量 Node 分片、lint、build、浏览器导入审计与严格 OpenSpec 校验均已通过，delta specs 已同步进主规格并归档。Agent 会话界面、其他工具和自动恢复仍需依照地图与执行计划分步实现。早期兼容性原型只保留为历史证据。

## 统一术语

项目根目录的 `CONTEXT.md` 已确定以下术语，后续规格、代码和 UI 应保持一致：

- **内置 Pi Agent Runtime（Built-in Pi Agent Runtime）**：随插件提供并由插件管理生命周期的 Agent 执行能力。避免使用“Pi Harness”或“内置 Harness”。
- **Pi Conversation（Pi 会话）**：由内置运行时持有的可持久化多轮交互。避免使用“自由聊天”或“Pi Chat Session”。
- **Pi Skill Run（Pi Skill 运行）**：由工作流发起并由工作流生命周期持有结果的 Agent 运行，即使包含多轮交互也不属于 Pi Conversation。
- **Pi Agent Transcript（Pi Agent 转录）**：归属于一个 Pi Conversation 或 Pi Skill Run 的完整持久化 Agent 历史，是消息、轮次、工具活动、分支和压缩记录的唯一事实源。
- **沙箱执行工具（Sandboxed Execution Tools）**：在隔离执行环境中运行的 Shell、文件读写和受策略约束的网络能力。
- **Zotero 原生工具（Zotero Native Tools）**：通过 Zotero capability broker 调用的文献库能力，边界是稳定 DTO 和受控操作，不暴露原始 Zotero 运行时对象。

## 已确认的产品与技术决策

以下边界已由项目术语、ADR 和执行计划确定；新证据需要通过相应决策记录处理：

1. 内置运行时只采用 `pi-agent-core + pi-ai` 的核心能力。会话持久化、权限、工具、日志、配置、UI 和其他外围设施由本项目实现。
2. 插件不打包 Node.js 运行时。Pi 必须经一个明确的 browser build boundary 进入 Zotero 插件环境。
3. MVP 必须包含 Pi Conversation，不能只做一次性任务执行。
4. 长期产品目标是完整 Agent，而非只读聊天组件。通用能力至少包括 Shell、文件读写、网络搜索和 fetch。
5. MVP 使用 [ADR 0002](../docs/adr/0002-policy-mediated-native-agent-execution.md) 确定的 Trusted Native Execution：Shell 由 Tool Gateway 按 Workspace Scope、命令与网络意图实施策略中介和增量审批。它依赖 Agent 信任，不声称具备 OS 级隔离或抵抗恶意原生代码。
6. Strong Sandbox Executor 是未来可选适配器；只有明确要求 Strong 的调用才能要求其能力证明。它不可用时不得把 Trusted Native Execution 冒充为 Strong。
7. 内置运行时的战略优势是 Zotero 原生工具：以与 `zotero-bridge` CLI 能力相近的工具面为参考，经插件内 Zotero capability broker 执行受控操作，减少外部协议与序列化绕行。
8. 通用执行与 Zotero Native Tools 属于不同信任域，均经 Tool Gateway 的受控入口；具体工具范围按后续 change 评审。
9. Pi Conversation 与 Pi Skill Run 的持久化由项目持有，完整历史只保存在每个 owner 的 canonical JSONL 中一次。SQLite 仅保存分离的 owner registry 与少量可重建标量，不得镜像 transcript payload；完整恢复、压缩、保留和清理契约见 [`docs/adr/0001-project-owned-pi-persistence.md`](../docs/adr/0001-project-owned-pi-persistence.md) 与 [GitHub #16](https://github.com/leike0813/zotero-agents/issues/16)。

Pi Conversation 已进入 MVP，完整工具能力仍是产品目标。C01 只验证运行时骨架，不代表 Pi Conversation 或工具链已交付。持久化与观测契约还应遵守 [ADR 0001](../docs/adr/0001-project-owned-pi-persistence.md) 和 [ADR 0003](../docs/adr/0003-pi-observability-and-failure-contracts.md)。

## 已完成的证据

### W0 C01：生产运行时骨架

- `@earendil-works/pi-agent-core` 与 `@earendil-works/pi-ai` 均精确固定为 `0.84.4`，见 [`package.json`](../package.json) 与 lockfile。
- [`src/modules/piRuntime.ts`](../src/modules/piRuntime.ts) 持有原生 Agent、模型流适配、会话与轮次。公开接口只给出项目自有的事件、结果和结构化失败；每个会话同时最多运行一个轮次，取消抑制迟到文本，`dispose` 可重复调用。
- [`tests/runtime/240-pi-runtime.test.ts`](../tests/runtime/240-pi-runtime.test.ts) 与 [`tests/zotero/core/lite/276-pi-runtime.zotero.test.ts`](../tests/zotero/core/lite/276-pi-runtime.zotero.test.ts) 复用确定性 faux stream，覆盖有序输出、空输出、并发拒绝、失败、取消、迟到事件和运行中释放。真实 Zotero 宿主通过临时单文件入口定向运行 8 项通过，且确认插件侧没有 Node runtime；临时入口已清理。
- Node runtime-provider-execution 分片、`npm run lint:check`、`npm run build`、OpenSpec 严格校验通过；[能力规格](../openspec/specs/builtin-pi-runtime-spine/spec.md)已同步，C01 change 已归档。
- 全量 `npm run test:zotero:core` 曾在既有库分页用例处长时间无进展并被中止；**没有全量通过证据**。定向 Pi 用例通过不能替代全量套件结果。

C01 没有生产 caller；Zotero 用例直接导入生产模块。真实 provider、凭据、owner 持久化、工具、Assistant Workspace 接入和重启恢复均未实现。

### W1 C02：Pi owner 持久化基础

- [`src/modules/piTranscriptStore.ts`](../src/modules/piTranscriptStore.ts) 在 `data/pi/owners/<kind>/<id>/` 持有每个 Pi Conversation / Pi Skill Run 的 canonical JSONL、严格 JSON 输入、owner 内序列、父项关系、有界字节分页、完整性检查和显式 torn-tail 修复；最终未换行片段被视为未提交，已提交损坏拒绝续写。每项上限 1 MiB，每页最多 200 项和 4 MiB。
- [`src/modules/piOwnerPersistence.ts`](../src/modules/piOwnerPersistence.ts) 提供两类独立 owner 记录与单 owner 串行写入，按 JSONL → 无 payload 索引 → SQLite registry 的顺序提交。投影失败返回 `pending`，同一 entry 重试不重复写入，可由 canonical JSONL 显式重建；本切片不启动自动恢复，也不重放工具副作用。
- [`src/modules/runtimePersistence.ts`](../src/modules/runtimePersistence.ts) 新增 Pi 路径，并把 Zotero 的无覆盖二进制写入明确设为 `IOUtils.write` 的 `create` 模式，与 Node 的独占创建语义一致；[`src/modules/pluginStateStore/piOwnerTable.ts`](../src/modules/pluginStateStore/piOwnerTable.ts) 在既有插件 SQLite 中增加一张 `pi_owner_registry` 表，没有新数据库或 transcript payload 副本。
- [`tests/runtime/241-pi-owner-persistence.test.ts`](../tests/runtime/241-pi-owner-persistence.test.ts) 覆盖索引和 SQLite 投影故障、显式尾部修复、已提交损坏及缺失父项；[`tests/runtime/piOwnerPersistenceShared.ts`](../tests/runtime/piOwnerPersistenceShared.ts) 同时供 Node 与真实 Zotero 用例使用，包含重复创建 owner 不覆盖历史的回归边界。Node 定向 6 项、runtime-platform-persistence 分片 10 文件、真实 Zotero 定向 1 项、TypeScript、Prettier/ESLint 定向检查、`npm run build` 和 OpenSpec 严格校验通过。
- [能力规格](../openspec/specs/builtin-pi-owner-persistence/spec.md)与 C02 change 同步。全量 Zotero core 套件未运行：本次用户明确接受以定向真实宿主验证作为 C02 门禁；C01 既有全量套件阻塞仍未解决。

### W1 C03：模型目录、配置与凭据

- [`src/modules/piModelCatalog.ts`](../src/modules/piModelCatalog.ts) 使用固定的 `@oh-my-pi/pi-catalog/models@18.0.11` 静态目录，并将本地 `models.yml` 限制为只读、无凭据的 provider/model 白名单；有效数据经归一化后缓存在现有 runtime cache。未知模型未声明的能力保持缺失，冲突的 bundled identity 被拒绝。
- [`src/modules/piProviderConfiguration.ts`](../src/modules/piProviderConfiguration.ts) 保存 profile 内多份 Pi 配置与全局、Conversation、Skill Run 默认项，按显式选择、owner 选择、kind 默认、全局默认、可用配置的顺序解析，并冻结不含密钥的选择快照。自定义端点明确 API dialect，远端只接受 HTTPS；本地端点记录后续 Local Network preflight 所需标记。
- [`src/modules/piCredentialStore.ts`](../src/modules/piCredentialStore.ts) 保存多个带标签的 API key / OpenAI Codex 加密记录；AES-GCM profile key 放在既有 `plugin_meta`。页面只拿到掩码元数据；损坏或缺失的密文与密钥读取失败即关闭，不回退到其他凭据。profile 全部可读者仍能取得 key，本设计不承诺 OS 密钥库隔离。
- Backend Manager 增加独立的“内置 Agent”页：管理配置、目录 overlay 和默认项，显示已保存凭据的掩码状态，不把 Pi 数据写入 `backendsConfigJson` 或 `BackendInstance`；API key 页面录入/清除、OpenAI Codex 连接与真实模型执行仍属于后续 change。
- Node 定向测试覆盖配置优先级、认证类型、目录白名单与 last-good 缓存、凭据替换及篡改；`runtime-provider-registry`、`dashboard`、`ui` 分片通过。真实 Zotero lite core 定向 5 项、UI 定向 1 项通过，UI 测试曾发现 Zotero 插件全局缺少 `structuredClone`，现已改用显式空状态构造。`npm run test:node` 全量运行未通过：多个非 Pi 分片失败，文献工作流出现 `embedded payload attachment is unavailable`；本次没有把这些失败归因于 C03，也没有全量 Node 通过证据。用户已接受 C03 的定向真实 Zotero core/UI 门禁，全量 Zotero 套件未运行。

当前写入会扫描 owner 的完整历史以检查损坏，并重建无 payload 索引；长历史的写入吞吐仍需实测后优化。C02 的持久化 API 尚无生产 caller，传入的 JSON payload 必须由后续 caller 在边界完成凭据脱敏。后续 lifecycle / startup reconciliation 由最终实施顺序中的 C19 负责。

### W1 C07：Pi Tool Gateway 策略内核

- [`src/modules/piToolGateway.ts`](../src/modules/piToolGateway.ts) 接受项目自有 descriptor，校验并冻结每轮模型可见工具目录及摘要；工具调用先经 schema、可信效果/资源分类、系统可准入范围、Runtime Capability Receipt 与当前授权判定。C08 的修正允许交互模式对当前授权之外但系统可准入的原调用请求一次精确审批；自动模式拒绝。
- Gateway 在完整批次预检后调度互不冲突的调用，同一 canonical 资源串行，结果按模型原顺序返回。执行前由 owner 提供的回调先持久化 `tool_call_started`，权威回执持久化后才暴露成功；效果无法确认时给出 `state_unknown`，不自动重放。精确审批只能在新 Runtime Turn 复核原参数及目录、授权、能力摘要后续行，不形成常驻 grant。
- C07 的持久化与权限回调只用确定性测试替身验证，尚未连接 C02 的生产 owner 或 Assistant Workspace。C08 已在独立模块中建立 Native 文件、搜索与 Shell 定义，并通过 Linux、Windows 定向宿主验证；生产 owner 接线仍待完成。C10/C11/C12 提供 MCP、Web、Zotero 工具，C16/C17 接入 Conversation 与 Skill Run，C19 负责最终 teardown、重启对账和有界恢复。
- 验证：`npm run test:node -- --shard runtime-provider-execution`、`npm run lint:check`、`npm run build` 与 `ZOTERO_TEST_GREP='Pi Tool Gateway' npm run test:zotero:core`（16 项）通过；最终验证记录见 [C07 verification](../openspec/changes/archive/2026-09-28-establish-pi-tool-gateway-policy/verification.md)。全量 `npm run test:zotero:core` 曾停在既有 SQLite 分页用例 `returns real SQLite pages with stable, user-visible results`，独立运行该用例 120 秒仍超时；目前没有全量 core 通过证据。#26 所列 `test:node:core` 脚本在当前仓库不存在，Node 使用现有分片命令。后续处理全量门禁时先调查该分页用例的阻塞，再重跑整套。

### W1 C09：通用长驻 stdio 进程桥（已归档）

- [已归档 OpenSpec change](../openspec/changes/archive/2026-09-28-generalize-windows-stdio-process-bridge/) 记录平台进程契约、ACP 迁移、Windows broker 与打包范围；W1 已收口。
- 当前工作区已建立 `src/platform/longLivedProcess.ts` 的 Node、Mozilla 与 Windows adapter，Windows ACP 子进程流已接入该接口；Windows daemon 服务移至 `src/platform/windowsStdioBridgeService.ts`。现有 POSIX ACP 进程组所有权校验保持原路径，通用 Node/Mozilla adapter 目前只保证直接子进程的有界终止，后续原生工具若要求 POSIX 进程树清理须先扩展并验证这一平台能力。Node 定向测试验证了流分离、UTF-8 跨 chunk、stdin EOF、缓冲上限、观察到的 exit 与断线 unknown；ACP transport 定向 43 项通过。最终验证结果以 change 的 verification 记录为准。
- Windows 主机已从重命名后的 Rust 源码构建 `zotero-stdio-bridge.exe` 并同步摘要，旧 ACP 二进制已移除；真实 Windows Zotero 10.0.2 长驻 stdio canary 通过。C09 实施任务 9/9 完成并归档。
- C09 的 `acp-runtime`、`runtime-platform-persistence`、`host-bridge-surface-release` Node 分片、lint、OpenSpec 严格校验与 Rust 测试通过；真实 Linux 和 Windows Zotero 的长驻 stdio 定向用例通过，Windows `npm run build` 和打包资产测试也通过。全量 Node 在其他领域出现多项失败，全量 Zotero core 在既有 library page query 阶段达到 180 秒上限；Windows canary 结束后曾需手动停止孤留的 stdio daemon 才使测试命令退出。完整命令与结果见 [C09 verification](../openspec/changes/archive/2026-09-28-generalize-windows-stdio-process-bridge/verification.md)。

### W2 C04：API key Provider 执行（已归档）

- [`src/modules/piApiKeyProviderExecution.ts`](../src/modules/piApiKeyProviderExecution.ts) 从冻结的选择快照逐次读取指定密钥，接入原生 Pi API stream，拒绝缺失凭据与未经授权的本地端点；`PiRuntime` 保留项目自有的失败码，不外传原生响应。
- Backend Manager 已增加 API key 的暂态输入、加密保存、清除及主动连接测试。测试只读取已保存配置并在短超时后取消，不自动运行，也不成为 Conversation 或 Skill Run owner。
- 浏览器构建为 `provider-env.js → node:fs` 的精确导入装有执行即抛错的 guard。Node 定向、生产 build、lint、真实 Zotero core/UI 定向用例与 OpenSpec 严格校验通过。Google 原生适配器不接受自定义 `fetch`，其不透明 SDK 错误暂归为 `provider_stream_error`；完整证据见 [C04 verification](../openspec/changes/archive/2026-09-28-add-pi-api-key-provider-execution/verification.md)。

### W2 C06：Pi Turn Preparation（已归档）

- [已归档 C06 change](../openspec/changes/archive/2026-09-28-establish-pi-turn-preparation/) 新增 `src/modules/piTurnPreparation.ts`，在每次模型调用前从 C02 的 revision、active leaf 和 parent-linked transcript 重建活动路径；只投影完整消息与工具配对，按冻结事实组装受管指令、Skill metadata、显式 Zotero selection、附件 opaque ref、用户文件路径和 C07 工具目录。`PiRuntime` 与 C02/C07 的生产实现未改动，Conversation/Skill Run 接线仍属于 C16/C17。
- C06 使用版本化 estimator 和有效 context window 计算预算；自动压缩只在超预算且已结算的边界运行，手动压缩要求 owner idle。超出单次摘要窗口的旧历史按完整单元分批汇总，每批有独立 preparation record；最终摘要经 schema、覆盖范围、输入 digest、完整 tail 和预算验证后，由注入的 C02 CAS 回调一次提交。普通与压缩 Provider 调用均先写不含凭据、正文或用户绝对路径的 `TurnPreparationRecord`；记录回调返回的当前 transcript basis 供后续记录和 CAS 使用。当前 C02 尚无生产 CAS API，C06 的注入回调由确定性替身验证；后续 owner 接线必须提供真正的 owner-locked CAS。
- 共享 Node 14 项、真实 Zotero core 定向 15 项、`runtime-provider-execution` 7 文件、TypeScript、完整 `npm run lint:check`、生产 `npm run build` 和 OpenSpec 严格校验通过；[能力规格](../openspec/specs/pi-turn-preparation/spec.md)已同步。用户撤回先修全量门禁的决定，明确接受定向验证作为 C06 归档门禁例外。`test:node:runtime` 在既有 `239-runtime-host-adaptation-governance` 默认 2 秒超时，provider-products 分片随后长时间无进展并被中止；全量 `test:zotero:core` 在 180 秒上限后退出 124。两项全量套件仍无通过证据，详见 [C06 verification](../openspec/changes/archive/2026-09-28-establish-pi-turn-preparation/verification.md)。

### W2 C08：Trusted Native Execution（已归档）

- [C08 归档变更](../openspec/changes/archive/2026-09-28-add-pi-trusted-native-execution/)的 8 项任务均已完成。`piTrustedNativeExecution.ts` 提供 Trusted Native 的 `read/bash|powershell/edit/write` 与 Restricted Broker 的 `read/edit/write/grep/find/ls` 固定目录。C07 Gateway 的 classifier 兼容异步路径证明；`runtimePersistence.ts` 按路径段检查 Node symlink、POSIX nsIFile symlink 与 Windows 原始 reparse 属性。Windows 通过 Gecko js-ctypes 调用 `GetFileAttributesW`，因为 `nsILocalFileWin` 的原始属性读取接口不能从脚本调用；无法证明路径时不发布文件能力。
- 文件与搜索限定在 Workspace Scope，结果与遍历有界；Restricted Broker 不调用子进程，`grep` 的正则只接受可有界执行的简单形式。Shell 在 Zotero 中使用 Mozilla Subprocess、替换环境和 owner scratch，超时或无法证明退出时给出 unknown。owner managed-file manifest 原子记录源身份/修订摘要、大小、复制时 SHA-256 与受管名；同源指纹复用，源改变产生新代。生成输出有独立提交与配额接口。小图像作为 JSON 内 base64 图像结果返回；Gateway 单结果 1 MiB 上限使当前 read 图像限于 700 KiB，后续模型图像投影仍需在 C16/C17 接线时确认。
- Linux 的 `runtime-provider-execution` Node 分片 8 个文件通过；Linux 与 Windows Zotero 10.0.2 的 `Pi Trusted Native in real Zotero` 定向 core 探针各 2 项通过。Windows 探针实际完成文件写读、PowerShell 执行和 junction 拒绝。`npm run build`、`npm run lint:check` 与严格 OpenSpec 校验通过。Windows Node 分片另有 5 个未通过用例：2 个 symlink fixture 缺少创建权限，3 个 mock Shell 用例固定期待 `bash`。用户接受定向门禁作为全量套件例外；全量 Node 与 Zotero core 均无 C08 通过证据。详情见 [C08 verification](../openspec/changes/archive/2026-09-28-add-pi-trusted-native-execution/verification.md)。

### W2 C10：MCP Tool Sources（已归档）

- [C10 OpenSpec 归档](../openspec/changes/archive/2026-09-29-establish-pi-mcp-tool-sources/)的四组任务共 11 项已全部完成，三个 delta（`pi-mcp-tool-sources`、`pi-tool-gateway-policy`、`backend-manager-ui`）已合入 `openspec/specs`。Backend Manager 独立内置 Agent 页现在管理 profile MCP 来源、加密凭据引用、显式的本地网络与明文授权、发现后的工具审阅、导入预览和无密钥导出。损坏的来源注册表拒绝调用，并提供显式重置。
- `piMcpToolSources.ts` 延迟连接 MCP v2 Streamable HTTP 或 C09 长驻 stdio 传输，按当前来源与凭据版本冻结每轮目录；仅审阅且 descriptor 未改变的工具进入 C07 Gateway。代理搜索、描述、调用和直出工具共用 Gateway 的效果分类、审批与回执，远端结果有大小和内容类型边界，未知结果不自动重放。插件入口延迟加载 MCP SDK，避免 Zotero 启动时提前求值。
- 已确认通过：全量 `npm run test:node`（28 个分片，2026-09-29 由用户执行确认，运行输出未留档）、Linux 的 `runtime-provider-registry` / `runtime-provider-execution` / `dashboard` / `ui` 分片、真实 HTTP MCP server 联调、Windows Zotero 10.0.2 完整 core（73 项通过、1 项 pending）与 UI 3/3、Linux 与 Windows 的真实 stdio 探针及 Backend Manager UI 探针、Windows C10 定向用例 10/10；`npx tsc --noEmit`、`npm run lint:check`、`npm run build`、`npm run check:pi-mcp-browser-bundle` 与严格 OpenSpec 校验通过。完整命令与结果见 [C10 验证记录](../openspec/changes/archive/2026-09-29-establish-pi-mcp-tool-sources/verification.md)。
- 全量 Node 从 14/28 分片失败转为全通过，取决于当前工作区尚未提交的一组测试治理与平台修正：Windows fixture 改用 `.cmd` 启动器、目录链接用例改用 junction 与按平台选择 shell 名、ACP e2e fixture 修正路径转义与 stderr 诊断、Host Bridge 与 Zotero Host 断言收紧，外加 `acpTransport` 的 Windows 参数传递与 `run-zotero-test-with-mock` 的 POSIX 路径修正。首次运行全量 Node 前还需按 [`docs/testing-framework.md`](../docs/testing-framework.md) 初始化 `literature-analysis`、`literature-explainer`、`literature-translator` 三个内置 Skill submodule。
- 归档收尾已完成：三个 delta 已合入 `openspec/specs`（`pi-mcp-tool-sources` 新建，`pi-tool-gateway-policy`、`backend-manager-ui` 追加），`openspec validate` 对这三份主规格与 change 均为 strict 通过，change 已移至 `openspec/changes/archive/2026-09-29-establish-pi-mcp-tool-sources/`。C10 尚未接入生产 Conversation / Skill Run owner；该接线仍属于 C16/C17。

### Pi core Zotero 兼容性原型

- 分支：`prototype/pi-core-zotero-compatibility`
- 提交：`c073b007`
- 远端：`origin/prototype/pi-core-zotero-compatibility`
- 主报告：`artifact/pi-agent-runtime/pi-core-zotero-compatibility/report.md`
- 原型说明：`artifact/pi-agent-runtime/pi-core-zotero-compatibility/README.md`

可在当前工作区直接读取报告：

```bash
git show prototype/pi-core-zotero-compatibility:artifact/pi-agent-runtime/pi-core-zotero-compatibility/report.md
```

已经验证：

- 固定版本 `@earendil-works/pi-agent-core@0.84.3`、`@earendil-works/pi-ai@0.84.3` 和 `@earendil-works/pi-telemetry@0.84.3` 可以按 `platform: browser`、`format: iife`、`target: firefox115` 打包。
- 产物在 Zotero 7.0.32 和 Zotero 9.0.4 中运行通过，宿主没有可用 Node.js runtime。
- Agent 流式循环、工具调用、取消、listener 清理、reset 和官方 OpenAI provider 的 fixture fetch 路径均已验证。
- `core + faux` bundle 为 670,855 B raw / 110,290 B gzip；加入 OpenAI 后为 1,210,816 B raw / 194,907 B gzip。
- OpenAI 路径只有一处已知浏览器构建例外：`@earendil-works/pi-ai/dist/utils/provider-env.js` 对 `node:fs` 的 Bun-only fallback。原型只对“精确 importer + 精确 specifier”设置执行即抛错的 guard，其他 Node builtin 一律令构建失败。

原型没有验证真实 API 网络、密钥存储、多 provider、插件卸载、多 Agent 并发、生产分包、许可证物化、沙箱工具或 Zotero 原生工具。它只回答了一个问题：Pi 的选定 browser 路径可以不依赖 Node.js 运行在 Zotero 中。

生产实现不能直接复制原型的临时依赖组织方式。应保留其严格的 Node builtin 审计思路，并为每次 Pi 升级重新运行兼容性探针。

### Agent 沙箱与权限模型研究

- 分支：`research/pi-agent-sandbox-models`
- 提交：`6786bbe9`
- 远端：`origin/research/pi-agent-sandbox-models`
- 报告：`artifact/pi-agent-runtime/sandbox-and-permission-models.md`

读取方式：

```bash
git show research/pi-agent-sandbox-models:artifact/pi-agent-runtime/sandbox-and-permission-models.md
```

该报告保留早期跨进程强沙箱方案的研究证据，其“MVP 无 Strong 即 fail closed”的结论已由 ADR 0002 取代。后续如选择 Strong 适配器，应读取[跨平台 Strong 研究](./pi-agent-runtime/cross-platform-sandbox-primary-research.md)及[架构原型](./pi-agent-runtime/cross-platform-sandbox-architecture-prototype.md)，按实际后端验证隔离、能力证明和故障路径。

## 当前工作区状态

在状态核对时，HEAD 为 `9de9d5afc`（`origin/dev` merge）；C10 实现、其测试与 OpenSpec 归档均已落盘（`78023c716`、`a8602bc77`，归档见 `openspec/changes/archive/2026-09-29-establish-pi-mcp-tool-sources/`），工作区还留有未提交的测试治理与平台修正、两份测试诊断 JSON、`docs/testing-framework.md` 与本文更新。C02 owner、Conversation/Skill Run 与普通用户交互尚未接线。以最新 `git status` 辨别所有权，不覆盖并行改动。

## 建议的系统边界

后续接线应沿用已确定的所有权和工具入口：

```text
[Assistant Workspace / Workflow UI]
                 |
                 v
[Pi Conversation / Pi Skill Run owner]
  registry + canonical transcript + 恢复
                 |
                 v
[PiRuntime：瞬态 Agent session/turn]
                 |
                 v
[Tool Gateway：策略与审批]
        |                         |
        v                         v
[Trusted Native Execution]  [Zotero Capability Broker]
 Shell/file/network          稳定 DTO + 受控 host 操作
```

设计时要守住几条边界：

- Pi SDK 的导入和事件归一化集中在 `PiRuntime`；后续 provider 接线要保持 browser build boundary，不把 SDK 状态泄漏为公开或持久化事实。
- Pi Conversation 应复用或适配项目已有 transcript、streaming、cancellation 和 owner 模型，避免另建一套不兼容的 UI 状态系统。
- Assistant Workspace 的 transcript-only 更新不得触发 toolbar、drawer、permission pane 等非 transcript 区域重建。现有 `AGENTS.md` 中的 owner-first、page-first、region signature guard 和 assistant chunk coalescing 约束继续生效。
- Trusted Native Execution 依 ADR 0002 处理 Workspace Scope、命令和网络意图；任何 Strong 能力声明均需另行建立并验证强制边界。
- Zotero 原生工具只交换稳定 DTO。不要把 `Zotero.Item`、窗口对象、数据库句柄或其他宿主对象交给 Pi。
- Zotero Native Tools 与 Trusted Native Execution 是不同信任域，统一经 Tool Gateway 路由；前者由 capability broker 控制文献库操作，后者依赖 Agent 信任和明确授权。

## 后续需要落实的边界

下列边界仍需后续 change 落实。先核对 #10/#26 和现行 ADR，再写明本次范围及可观察的完成条件。

### Runtime 与 provider

- C01 已固定 `0.84.4`；后续升级需重跑 browser 兼容性与真实宿主探针。
- C03 已固定静态目录；C04 的原生 API stream 选择和精确浏览器构建 guard 已进入实现，后续 Pi 升级需重跑真实宿主探针。
- C03 已提供 API key 加密存储、脱敏元数据与显式删除；C04 逐次读取显式选择的密钥并归一化失败，C05 仍需处理 OpenAI Codex OAuth。
- 真实 fetch 的 CORS、Zotero proxy、重试、超时、限流和错误归一化。
- 多会话并发、插件禁用/卸载、窗口关闭和异常退出时的资源清理。

### Pi Conversation 与现有 UI/工作流

- C02 owner 与 Pi Conversation 如何映射现有 Assistant Workspace 的 backend、conversation owner、transcript store 和 snapshot contract；C02 目前只提供存储，不提供 UI 投影。
- Built-in Pi 执行后端类型如何通过现有后端适配器边界接入。
- 自由输入与工作流任务如何共用一个会话生命周期，同时保持任务状态和 transcript 边界清晰。
- 已确定的 Pi Agent Transcript 如何通过现有 page-first、owner-first 投影契约接入 Assistant Workspace，以及模型选项和取消行为如何出现在公开接口中。
- Pi 事件如何归一化到 ACP Chat / ACP Skills 已共享的 transcript boundary 分类，避免按 provider 名称做特判。

### Trusted Native Execution 与可选 Strong

- C08 已提供 Shell、文件和进程内搜索的 schema 与执行器；fetch、web search、宿主权限呈现和 Conversation/Skill Run 接线仍属后续 change。生产 owner 须把 C08 工具目录、Runtime Capability Receipt 和受管文件操作接入 C07/C02，不得把定向执行器测试当成端到端 Agent 交付。
- Workspace Scope、命令和网络意图须遵守 ADR 0002；opaque executor 的潜在宿主访问必须在授权界面明确呈现。
- 未来如引入 Strong Executor，再单独规定各平台适配器、能力证明、路径与网络隔离、资源限制和失败处理，不将研究原型视为已实现安全保证。

### Zotero Native Tools

- 以哪些 `zotero-bridge` CLI 能力为参考建立首批工具目录，哪些能力明确不开放。
- capability broker 的接口、稳定 DTO、schema 版本和错误模型。
- 查询、选择项、附件、笔记、标签、集合、全文和检索能力的读取边界。
- 写操作的审批、事务、幂等、批处理、冲突、撤销与恢复语义。
- 工具结果的大小控制、分页、附件文本引用和敏感字段过滤。
- 与现有 `hostApi`、Host Bridge、工作流 protocol 的复用边界，避免复制业务规则。

## 下一步实施入口

C10 的实现、Linux/Windows 宿主门禁、Windows 完整 Zotero core/UI 与全量 Node（28 个分片）均已通过，change 的 11 项任务全部完成，delta specs 已同步进 `openspec/specs` 并归档。按 [#26 最终 wave 表](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5552013273) 选择后继 change。C06 的全量 runtime/core 阻塞保留在[验证记录](../openspec/changes/archive/2026-09-28-establish-pi-turn-preparation/verification.md)中，后续单独排查；不能用本次定向结果宣称全量通过。

接续工作按 [C04 verification](../openspec/changes/archive/2026-09-28-add-pi-api-key-provider-execution/verification.md) 和 C06 的验证记录核对 Provider 与 context 边界。Assistant Workspace、具体工具和自动恢复分别遵守 ADR 0001/0003、区域级 DOM identity 约束和 ADR 0002。后续会话接线是 C16，Skill Run 接线是 C17，生命周期恢复是 C19。每项能力的完成证据应落在对应 OpenSpec change 与测试中，并回写本文状态。

## 实施前的代码探索入口

接手 Agent 应以代码为准核对以下区域，并记录文档漂移：

- `src/modules/assistant*.ts`、`src/shared`：Assistant Workspace 的模型、snapshot、wire contract、transcript projection 与渲染边界。
- `src/modules/acp*.ts`、`src/providers/acp`：会话、事件、取消、消息合并和 provider 适配先例。
- `src/backends`、`src/providers`、`src/modules/workflow/settings/backendManager.ts`：既有 Backend Profile 与 C03 独立 Pi 配置边界。
- `src/workflows`、`src/modules/workflow*`、`src/modules/workflowExecution`：任务执行与自由会话是否应共享的协议。
- `src/modules/zoteroHostCapabilityBroker.ts`、`src/modules/hostBridge/`：可复用 Zotero 能力、Host Bridge 投影和现有安全边界。
- `src/platform`：平台命令、路径、环境与子进程抽象；只能用于理解现状，不能把 Node-only 代码带进插件 runtime。
- `tests/runtime`、`tests/zotero/core/lite`、`scripts/run-node-test-shards.ts`：C01 共享行为测试与真实 Zotero runner。
- `openspec/specs`、`openspec/changes`：选择最接近的规格和 change 组织方式。

如果工作区有 `.codegraph/`，先按项目 `AGENTS.md` 使用 CodeGraph 理解相关调用链。

## 测试与证据策略

后续应采用 TDD，但只锁定稳定、可观察的行为：

- runtime adapter：事件归一化、取消、dispose、错误码、Node builtin build gate。
- Pi Conversation：owner 隔离、恢复、streaming、取消、transcript projection 和 DOM identity 不变量。
- Trusted Native Execution：Workspace Scope、审批和命令/网络意图的实际行为；Strong 适配器只有在引入时才验证其强制隔离和能力证明。
- Zotero 原生工具：DTO/schema、权限分类、分页/大小上限、只读与写入边界。
- 兼容性：按 `tests/zotero/compatibility-matrix.json` 的受支持版本运行对应宿主验证，并区分定向用例与全量套件结果。

不要为完整提示词、UI 文案、日志全文、字段顺序或内部调用顺序添加脆弱测试。真实宿主、跨进程和安全边界的证据优先于大段 snapshot。

## 禁止的捷径

- 不得为了使用 Pi SDK 打包 Node.js runtime 或给插件环境补一套宽泛 Node polyfill。
- 不得导入 `pi-agent-core/node`、`session/testing`、`providers/all`、compat、OAuth 或 Bedrock 路径，除非新的独立研究证明其浏览器边界并获得设计批准。
- 不得把 Pi 默认工具、extension、MCP 或任意 host callback 绕过 Tool Gateway 直接暴露给模型。
- 不得把 Trusted Native Execution 描述为 Strong；明确要求 Strong 的调用在适配器不可用时必须失败。
- 不得把项目 trust、permission allow 或用户审批描述为 OS/容器/VM 级强制隔离。
- 不得向 Pi 暴露原始 Zotero runtime 对象，也不得绕过 capability broker 直接调用任意 `hostApi`。
- 不得为 Pi Conversation 复制一套与现有 Assistant Workspace 相冲突的 transcript 渲染和持久化系统。
- 不得因研究原型或 C01 faux turn 已通过，就推断真实 provider、工具或完整宿主矩阵已经验证。

## 接手与持续更新

1. 读取 `AGENTS.md`、`CONTEXT.md`、本文、#10/#26 和 C01/C02 归档规格；检查当前工作树，避免覆盖并行改动。
2. 以最新 issue 的下一项 change 为范围，追踪实际代码调用链，写明与 `PiRuntime`、owner、provider、Tool Gateway 的边界；按项目流程完成规格、TDD 和宿主验证。
3. **每个后续实现 change 结束时更新本文**：推进“已完成的证据”和“后续需要落实的边界”，记录验证通过与未完成的范围，替换失效链接和旧路径，再更新状态日期。只记已确认事实；研究建议和规划保留其状态标识。

本次 C01 的全量 Zotero core 套件结果仍待补齐；C02、C03 和 C08 依据各自确认的定向宿主门禁完成，没有各自的完整通过证据。这些记录中的全量 Node 失败（C03 的其他分片、C06 的 `test:node:runtime` 分片、C08 的 Windows 平台假设）已随 C10 收尾时进入工作区的测试治理修正一并消除，2026-09-29 的全量 `npm run test:node` 已 28 个分片全部通过；仍待单独复跑确认的是 C06 记录的全量 `test:zotero:core` 阻塞。后续复跑应记录实际命令、通过范围和失败原因，不把定向结果写成全量通过。
