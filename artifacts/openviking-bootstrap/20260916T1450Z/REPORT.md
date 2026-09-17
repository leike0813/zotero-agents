# REPORT.md — 项目审计与 OpenViking 知识初始化

- run_id：`20260916T1450Z`
- 依据：`artifacts/openviking_initialization_guide.md`
- 本地产物目录：`artifacts/openviking-bootstrap/20260916T1450Z/`（**未跟踪**，未改 `.gitignore`）
- 执行者：单一执行者完成全部 OpenViking 写入；8 个只读侦察子代理的产出按其原始身份标注为「待核查材料」。

---

## 1. 审计基线与范围

| 项 | 值 |
|---|---|
| 项目根 | `/home/joshua/Workspace/Code/JavaScript/zotero-agents` |
| 项目标识 | `zotero-agents`（`package.json` version `0.9.0`） |
| 分支 | `research/e2e-historical-regressions` |
| HEAD | `d75221a75e1e40425edd20c1c5a198c6f1bb6975`（`v0.8.3-430-gd75221a7`） |
| 与 main 关系 | merge-base `e210997a11e0054a3cb4ae0656e5cfb96102a09c`；HEAD 领先 `origin/main` 428 个提交 |
| 工作区 | 审计开始时仅有 1 个未跟踪文件（本任务输入）。**审计结束时已跟踪文件零修改**，HEAD 未变 |
| 已跟踪文件 | 11,137 |
| 环境 | Ubuntu 24.04.4 / Linux 6.8.0-139 / x86_64；Node v24.12.0 / npm 11.6.2；rustc 1.92.0 + `nightly-2026-07-25`；uv 0.9.17 |

**审计对象是工作区当前状态**（HEAD + 本任务未跟踪输入），不是纯 HEAD 版本。已跟踪文件与 HEAD 一致。

### 子模块与外部引用边界

7 个子模块均处于记录 commit：`references/Skill-Runner`(`b89d366d`)、`references/Zotero-7`(`188c54c1`, 7.0.32)、`references/Zotero-9`(`7132587c`, 9.0.6)、`references/Zotero-10`(`36749bd0`, 10.0.1)、`skills_builtin/literature-{analysis,explainer,translator}`。**这些外部实现未审阅**，不计入已审计范围；嵌套子模块未初始化。

`packages/synthesis-{contracts,engine,repository,application}` 是 npm workspaces，属本项目自研，纳入范围。

### 工具状态与降级说明

- **CodeGraph**：与当前 worktree 一致、索引最新（2,143 文件 / 58,446 节点 / 214,434 边）。但 `codegraph status` 提示索引由**旧版本引擎**建立，可能缺少新引擎才解析出的边。**未重建索引**（指南禁止顺带重建），改以源码阅读 + `grep` 补足。
- **OpenViking**：健康；项目 peer = `github.com-leike0813-zotero-agents`（由 `git remote origin` 推导）；审计开始时项目 peer 空间仅有 1 个既有文件，无重复初始化风险。

### 自动捕获边界（阶段 0.5，已核实）

- 本会话**正在被自动捕获**（`sessions/dsh-a171cd1d-…/messages.jsonl`，`.meta.json` 的 `peer_id` 为本项目）；自动召回也已发生（`.recall_log.json` 记录 9 条注入 URI）。
- `~/.openviking/ovcli.conf` 里的 `plugin.autoRecall/autoCapture/noAutoInject` **不约束** DSH 记忆插件（插件只读自身配置与 `OPENVIKING_*` 环境变量）。
- assistant 文本会被捕获并做语义提取；**工具结果不捕获**；`skipSubagentSessions` 默认 false。
- **因此：8 个侦察子代理的会话同样被捕获并提取。** 审计期间项目 peer 空间从 1 个文件增长到约 27 个，其中相当一部分来自子代理会话。这带来两个已核实的问题：自动提取的记忆里出现了**中间过程残留**（如「第二部分尚未完成 → 父 agent 续写」），以及**把任务指令折进了偏好记忆**。详见 `retrieval-checks.md` §二。
- **本报告不承诺本提示词能阻止服务端提取草稿。** 明确的限制。

---

## 2. 覆盖统计、排除范围与未完成项

### 盘点覆盖率 vs 实际审阅覆盖率

盘点（阶段 1）：**11,137 / 11,137 = 100%** 已分类并记录状态，见 `inventory.csv` / `inventory-summary.md`。

| 类别 | 文件 | 行数 |
|---|---:|---:|
| doc（含 openspec 5,527 归档 + artifacts 916） | 7,434 | 791,416 |
| test | 930 | 587,644 |
| generated（help-docs / host-bridge-skills / hermes profiles） | 856 | 432,770 |
| **source（src + packages + rust）** | **841** | **516,458** |
| content（skills_builtin / skills_src / workflows_builtin） | 428 | 125,294 |
| asset | 378 | 540,220 |
| script | 117 | 33,284 |
| config | 87 | 40,226 |
| contract | 27 | 71,280 |
| external（references 基线） | 12 | 4,226 |
| other | 27 | 5,289 |

实际审阅覆盖率：**没有达到逐文件审阅，也不声称达到**。本次采取的形态是「8 个职责域的整体侦察 + 主审计者对高风险边界的定向深读与独立复核」。诚实的口径：

- **逐行或等价逐行审阅的**：插件入口与生命周期（`src/index.ts`、`src/addon.ts`、`src/hooks.ts` 的启动/关停/超时路径）、构建配置（`zotero-plugin.config.ts`）、TS/lint 忽略边界、`releases/host-bridge/cli-release.json`、`guardedSqlite.ts`、`runtimeLogManager.ts` 的脱敏与日志写入路径、`zoteroHostCapabilityBroker.ts` 的并发闸门与错误分类相关区段、`acpSkillRunnerWorkspace.ts` 的注册表、`skillRunnerLocalRuntimeManager.ts` 的租约与 stop 路径、`skillRunnerAsyncLifecycle.ts`、合成仓库的 schema 计数与版本常量。这些文件在 `evidence.md` 中逐条给出符号与行号。
- **整体侦察但未逐行**：ACP（85 文件 / 49,277 行）、Host Bridge（36 / 25,000）、SkillRunner（36 / 25,016）、Synthesis（TS 侧 46 + Rust 107）、workflow 三层（74 / ~40,000）、UI 页面层、`packages/*`。
- **`zoteroHostCapabilityBroker.ts` 单文件的审阅比例**：侦察报告自述逐行约 1,450 行（7.8%），最大未逐行区段 `:6355-10059` 与 `:10096-11869` 合计约 10,400 行（56%）。主会话在其上另做了定向深读（并发闸门、错误分类、观察比对）。**因此该文件记为 partial，不是 reviewed。**

排除范围与理由：

| 排除项 | 理由 |
|---|---|
| `references/Zotero-{7,9,10}`、`references/Skill-Runner` | 固定 tag 的外部基线，不算本项目自有行为；且项目规则禁止默认扫描 |
| `.codegraph/`（589 MB DB）、`rust/*/target/`（13 GB）、`node_modules/`、`.scaffold/` | 生成物 / 依赖 / 构建缓存 |
| `addon/content/help-docs/`（505 文件） | 自动生成，仓库内明确标注「不要直接修改」 |
| `addon/content/host-bridge-skills/`（166 文件）、`profiles/hermes/`（185 文件） | 由渲染脚本物化的生成物（源在 `skills_src/`、`profiles_src/`、`contracts/`） |
| `openspec/changes/archive/`（5,527 文件） | 历史变更归档；按主题定向查阅而非通读 |
| `site/`（606 文件）、`README-*.md`（11 种语言） | 用户文档站点与翻译，与实现行为无直接关系 |

**未完成项（明确列出，不掩盖）**：

1. `zoteroHostCapabilityBroker.ts` 约 56% 的行段未逐行审阅（partial）。
2. 9 个 Node 测试领域未运行（acp / assistant / dashboard / host-bridge / runtime / skillrunner / synthesis / tooling / ui）；全部真实 Zotero 层、E2E、lint、clippy、fmt、`npm run build`、全部 parity 脚本未运行。**本次没有这些证据。**
3. `workflow` 领域测试首轮运行未在会话内返回，改为后台重跑并完整捕获（已完成，见 §6）。
4. ACP 与 UI 的若干疑点（各 14 / 16 条）只有侦察级别证据，未逐条复核。
5. 未做 `git bisect`（会改变工作区基线），因此测试红灯的根因未定位。

---

## 3. 项目结构与核心流程（简洁总结）

**定位**：一个 Zotero 插件，把文献与知识工作能力以可插拔工作流架在 Zotero 库之上。插件本体提供通用 UI 与菜单，**不含业务逻辑**；业务逻辑由工作流包（`workflows_builtin/` 等）与 skill 包声明。目标宿主 Zotero 7 / 9 / 10。构建用 `zotero-plugin-scaffold` + esbuild（`target: firefox115`），10 个入口。

**分层**：

- 宿主与生命周期：`src/{index,addon,hooks}.ts`
- 工作流引擎：`src/workflows/`（引擎 + Host API 投影）→ `src/modules/workflow/`（目录/设置/菜单）→ `src/modules/workflowExecution/`（prepare/submit/run/apply 四道 seam + 序列执行器）
- 宿主能力：`src/modules/zoteroHostCapabilityBroker.ts`（18,546 行，语义唯一事实源）+ `src/modules/zoteroHost/`（私有原语）+ `src/modules/zoteroHostMutationAuthority.ts`（canonical mutation 授权与 receipt）
- 远程边界：`src/modules/hostBridge/`（进程内 nsIServerSocket HTTP）+ 同一 socket 的 `/mcp` 路由；CLI 侧 `rust/zotero-bridge/`
- Agent 传输：`src/modules/acp/`（ACP Chat + ACP Skills）与 `src/modules/skillRunner/`（旧式 HTTP 后端），经 `src/providers/` 的 Provider 抽象（按 `requestKind + backend.type` 两段式分派，无 providerId 特判）
- Synthesis：Rust sidecar 是唯一生产 owner（`rust/synthesis-sidecar/`，14 crate）；TS 侧只做进程监督、RPC、分组 client 与 Preact UI
- UI：`src/sidebar/`、`src/dashboard/`、`src/synthesis/`、`src/shared/*WireContract.ts`（跨边界 DTO 唯一来源）

**五条核心流程**（详见 `docs/architecture-flow.md` 与资源 `project-overview.md`）：工作流执行（菜单 → SelectionContext → 请求编译 → JobQueue → provider → applyResult 写 Zotero）、ACP Chat（`acpSessionManager.ts:2730` → NDJSON/JSON-RPC → transcript 边界分类 → workspace 发布）、ACP Skills（`acpSkillRunnerOrchestrator.ts:592` → workspace/skill 物化/schema 校验/prompt/输出收敛 → 交 workflow apply）、SkillRunner（`runWorkflowExecutionSeam` → JobQueue → `SkillRunnerProvider` → HTTP+SSE → 事件落 SQLite）、Synthesis（TS 监督 sidecar；`discovery.json` 原子写即 ready 提交）。

**持久化**：插件 SQLite `state/zotero-agents.db`（`pluginStateStore.ts` + 表定义目录）、运行期文件（路径唯一由 `runtimePersistence.ts` 解析）、Zotero prefs（`backendsConfigJson` / `workflowSettingsJson`）、Synthesis sidecar SQLite（62 表 / 51 索引，schema v6）。

---

## 4. 最重要的已确认问题（附触发条件与证据）

完整分级清单见 `findings.md`。以下为影响最大的四项。

### 4.1 当前基线上两个测试领域红灯，且失败同源【confirmed / runtime】

- **触发条件**：直接运行 `npm run test:node -- --domain zotero-host` 或 `--domain workflow`。
- **结果**：前者退出码 1、**10 个失败**；后者退出码 1、**63 个失败**（`workflow-host` 分片全绿，说明不是 host-api 投影本身）。失败形态是 mutation outcome 期望 `committed` 而得到 `failed` / `repair_required`，以及计数期望 1 而得到 0。
- **共同签名**：`prepared mutation no longer matches current Zotero state`，出现在 `tests/zotero-host/102-…:1994`、`tests/workflow-tag-regulator/64-….shared.ts:310` 等；栈显示错误从工作流包 hook（`workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:70`）抛出。
- **已排除的替代解释**：不是环境缺失（同次运行有分片全绿）；不是「本分支已知红状态」（分支最新提交的研究产物未提及这些文件）。
- **未完成**：根因未定位（未做 bisect，那会改变工作区）。
- **需要决定**：这是产品缺陷，还是 mock/authority 语义在近期重构后未对齐。

### 4.2 mutation 错误分类被降级【confirmed / static，理由闭合】

- **影响**：一个要求「刷新后以**新操作**重试」的 stale 冲突（`code=conflict`、`recovery=refresh_and_retry_new_operation`、`details={reason:"revision_mismatch"}`），被上报成「可用**同一操作**重试的 staging 失败」（`code=execution_failed`、`recovery=retry_same_operation`）。按后者重试会拿同一份失效输入再撞一次。
- **证据闭合方式**：该消息在全 `src/` 只有 `zoteroHostCapabilityBroker.ts:14298` 一个产出点；而失败运行的 attempt 记录形态与 `:5207-5209` 的包装完全同形（保留内层 message、单个 item affectedRef、空 residualRefs）。`:12406`、`:12418`、`:11315` 三处同类包装都有 `instanceof MutationAuthorityExecutionError` 直通保护，**`:5200` 没有**。
- **已知限制**：未证明失败测试必然经过 `:5200`（同形包装有 5 处）。
- **需要决定**：是否修正该分类（属行为语义变更）。

### 4.3 Host Bridge CLI 预构建不新鲜【confirmed / runtime】

- **证据**：`check-host-bridge-cli-prebuild-freshness` 退出码 1，`host_bridge_cli_fingerprint_stale`，manifest `2ef15640…` vs current `775433ca…`。根因线索：清单的 `fingerprintInputs` 仍指向 `cli/…`、`host-bridge/…`，这些路径在当前树中全部不存在（目录已搬到 `rust/…`、`contracts/…`）。
- **对照**：`check:synthesis-sidecar-runtime-freshness` 通过（`e6eef533…`，七平台）—— 说明这不是环境噪声。
- **含义**：随包分发的 CLI 二进制不对应当前源码输入；Host Bridge 发布的前置条件未满足。这不是违规（预构建本就是发布前置），而是当前状态。
- **需要决定**：是否安排重新预构建。

### 4.4 审计过程中的一次凭据暴露事故【confirmed / 操作事故】

- **经过**：为确认 OpenViking 的 autoRecall/autoCapture 归属，我按键名黑名单脱敏打印 `~/.openviking/ov.conf` 结构。正则写作 `(key|token|secret|password)\s*[:=]\s*\S+`，只匹配 `key:` 形态；JSON 中是 `"root_api_key": "…"`，键名与冒号间有引号 → 未命中，密钥明文进入工具输出。
- **影响边界（已核实）**：未写入任何审计文件（`grep` 前 8 位 → 0 命中）；未写入 OpenViking。但该输出进入了本会话，而本会话正在被自动捕获 → **可能随会话记录落盘并可能被提取，本会话无法撤回**。
- **处置需由用户执行**：轮换 `root_api_key`；复核该会话目录；检查当日已提取的记忆。
- **泛化教训**：按键名黑名单脱敏只在秘密总落在已知键名下时成立。凡是允许自由文本、嵌套结构或被引号包裹键名的场合，都必须改为**白名单式输出**或值级模式扫描。项目自身的 `runtimeLogManager.ts` 有同一个弱点（`message` 与 `error.message` 只做截断、不做内容模式匹配），本次记为 suspected（未找到可达的泄漏调用点）。

---

## 5. 待核实问题与需要决策的事项

详见 `findings.md` §八汇总表。分类摘要：

**需要用户或更强模型决定**

| 事项 | 为什么本次不代决 |
|---|---|
| 两个测试领域的红灯是缺陷还是预期红状态 | 分支名为 `research/…`，可能是进行中的工作 |
| 是否修正 staging 的错误分类 | 行为语义变更，需确认调用方是否依赖现有分类 |
| `poll.timeout_ms` 补齐实现还是从契约移除 | 公开契约变更，需契约 owner 判断 |
| 是否安排 Host Bridge CLI 重新预构建 | 涉及发布身份与外部构建，属需授权动作 |
| 是否修正 6 处文档漂移 | 指南禁止本次修改 AGENTS.md 与正式设计文档 |
| 是否为日志脱敏增加内容模式 | 有误伤风险，需安全判断 |
| `addon/content` 手写 JS 是否纳入静态检查 | 工程门禁取舍 |
| `tests/fixtures/selection-context` 下 23 个真实论文 PDF 的授权与去标识化状态 | 涉及隐私/版权判断；本次只到「疑似」级别证据，未记录任何文件名 |
| 自动提取记忆中出现的中间过程残留与指令膨胀是否清理 | 那些文件不属本次明确归属的产物，本次未覆盖 |

**保留为待核查（证据不足，不写成结论）**

`zoteroHostCapabilityBroker.ts` 的 strict-JSON 断言是否覆盖全部公共读路径；宿主槽队列是否真「进程级」；strict-JSON 断言失败的 `TypeError` 是否有统一转换；`bindPrefEvents`（约 2,540 行单函数）是否有行为测试；ACP 侧若干 Map 的清理与并发上限；claude raw-SDK fallback 是否绕过 transcript 边界分类；`AcpProvider` 对 sequence kind 的 `supports()`/`execute()` 矛盾；Workflow Host API 版本在运行时无门禁；Synthesis discovery parity 语料固定在 v2 而生产 v5；Host Bridge 的 `cli-commands.v2.json` 无生成器与若干孤儿 schema。

---

## 6. 实际执行的检查及结果

完整记录见 `validation.md`；原始日志为 `validation-*.log`。

**通过**

| 命令 | 退出码 | 结果 |
|---|---|---|
| 8 条 `npx tsc --noEmit [-p …]`（根 / sidebar / dashboard / synthesis / 4 个 packages） | 0（8/8） | 无诊断 |
| `cargo +nightly-2026-07-25 test --workspace --locked --no-fail-fast --manifest-path rust/synthesis-sidecar/Cargo.toml` | 0 | 33 目标 / **351 通过 / 0 失败 / 0 ignored** |
| `npm run check:synthesis-sidecar-runtime-freshness` | 0 | `e6eef533…`，七平台齐全 |
| `npx tsx scripts/run-node-test-shards.ts --list-shards` | 0 | 28 分片 / 11 domain / 272 文件，无未归属 |

**失败**

| 命令 | 退出码 | 结果 |
|---|---|---|
| `--domain zotero-host` | 1 | 10 个失败（`102-…` 9 个断言 + `130-…` 1–2 个 2000ms 超时，超时数量两次运行不同 → 不稳定） |
| `--domain workflow` | 1 | 63 个失败（engine 6 / packages-literature 38 / packages-workbench 18 / packages-tags 1；host 全绿） |
| `node scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs` | 1 | `host_bridge_cli_fingerprint_stale` |

**未执行及原因（不把环境缺失等同于代码错误）**

`npm run build`（第一步 `build:help-docs` 会写 `addon/content/help-docs/`，故改为直接跑其类型检查子步骤）；`test:lite` / `test:full` / 全部 `test:zotero:*`（需真实 Zotero 宿主，会生成 XPI 并产生 `.scaffold/test` 状态，属重副作用路径，未在未获确认时运行）；`test:gate:pr|release`；`lint:check`；`cargo clippy` / `cargo fmt --check`；全部 parity/一致性 check 脚本；`codegraph index/sync`；任何依赖安装。

---

## 7. OpenViking 资源与记忆的写入结果

写入台账见 `writes.jsonl`（逐条含真实 URI、字节数、返回状态、回读与检索状态）。候选评估与「为何不写」见 `memory-candidates.yaml`。

### 项目资源（8 份，`peers/github.com-leike0813-zotero-agents/resources/`）

| URI 后缀 | 字节 | 内容 |
|---|---:|---|
| `project-overview.md` | 9,050 | 定位、构建、分层表、五条流程、持久化、约束、漂移、实测摘要 |
| `host-capability-and-bridge.md` | 5,948 | broker→contracts→registry→Host Bridge→MCP/CLI 单向链、并发与本地性 |
| `agent-transports-acp-skillrunner.md` | 6,233 | 两个平行传输、入口符号表、transcript 硬约束对应、租约模型 |
| `workflow-engine-and-packages.md` | 5,868 | 三层分工、Host API v12、内容包约定、序列执行 |
| `synthesis-stack.md` | 6,165 | Rust owner、三条协议、v6 仓库、packages 真实依赖面 |
| `build-test-release-operations.md` | 6,328 | tsc 矩阵、测试分层、门禁、新鲜度门禁、会写盘的命令 |
| `documentation-index.md` | 5,633 | 权威层级、按主题找文档、漂移清单 |
| `audit-2026-09-16-confirmed-issues.md` | 8,689 | 确认问题与验证状态，含「有意设计勿误读」清单 |

编写原则：**引用权威文档并说明本次核查状态，不复制成第二份规范**（指南 §9.1）。

### 项目长期记忆（6 条，`peers/github.com-leike0813-zotero-agents/memories/`）

| URI 后缀 | 字节 | 主题 |
|---|---:|---|
| `entities/verification/baseline_verification_2026_09_16.md` | 5,351 | 基线实测结果与复现命令（子代理未运行测试，故此为新增知识） |
| `entities/navigation/project_knowledge_pack.md` | 3,538 | 知识包与审计材料的位置 |
| `entities/finding/mutation_staging_stale_error.md` | 4,060 | stale 报错的排错入口与分类降级形态 |
| `entities/docs/documentation_drift.md` | 2,985 | 11 处文档漂移 |
| `entities/plugin/openviking_peer_capture_boundary.md` | 4,466 | 捕获边界与 peer 空间写入行为 |
| `entities/process/secret_redaction_lesson.md` | 2,528 | 按键名脱敏不足的教训 |

每条均带 `as_of`（commit 或会话标识）、适用条件与 `recheck_when`。**未写入任何用户级偏好、身份或跨项目约束。**

### 去重与幂等

- 写入前核对既有：审计开始时项目 peer 空间仅 1 个与项目架构无关的文件。
- 审计过程中自动提取新增约 25 个文件；对每条候选逐一做了 `existing_match` 判定，**其中 3 条因与自动提取内容重叠而降级为 skip**（见 `memory-candidates.yaml` 的 `life-managed-runtime-lease`、`life-registry-no-cleanup`、`dup-yield-policy-triplication`）。
- 未批量删除或覆盖任何未知来源记录。唯一删除是本次自己创建的写入路径探测文件。

### 处理状态（严格区分四态）

- **请求已提交**：全部 14 次写入均返回确认（资源回执 `semantic=queued, vector=queued`；记忆回执 `semantic=skipped, vector=queued, overview=complete`）。
- **后台处理完成**：由回执中的 `overview=complete` 与后续 `list`/`read` 可见确认。
- **最终内容已读到**：`project-overview.md` 全文回读逐字一致；其余经自动 `.overview.md` 摘要核对。
- **语义检索可召回**：见 §8。

**无 pending 条目**；无写入失败。

---

## 8. 回读与检索验收结果

完整记录见 `retrieval-checks.md`。

- **回读**：写入内容可读且与候选一致；`as_of`、适用条件、来源字段完整保留；项目归属全部正确（均在 `peers/github.com-leike0813-zotero-agents/` 下）。
- **检索**：9 个自然语言问题（未限定 `target_uri`、未把答案塞进查询）中 **7 个返回材料足以支持答案**；1 个（设计动机类）正确地「无可编造的材料」；1 个（是否存在覆盖率门槛）为清单枚举式的间接证据。
- **发现并记录的失真（均来自自动提取管线，非本次手工写入）**：自动摘要使用英文而原文以中文为主；`module/synthesis_stack.md` 残留了子代理的中间进度句；`preferences/joshua/测试运行约定.md` 被任务指令膨胀并沿用了 AGENTS.md 的目录漂移表述。**本次不覆盖这些文件**（不属本次明确归属的产物）。
- **跨项目噪声**：用户级 `memories/events/` 中其它项目（chezmoi/agent-ctl）的事件会被召回，读者需自行判断归属。
- **未完成**：真实新会话的端到端召回验证。本环境无法提供独立会话。**已完成的是工具检索验收，未完成真实新会话端到端验证**；不得据此声称所有 harness 的自动召回均已验证。

---

## 9. 本地产物路径与取得的 OpenViking 标识

### 本地产物（全部位于 `artifacts/openviking-bootstrap/20260916T1450Z/`，未跟踪）

`STATE.md`（基线与阶段）、`inventory.csv` + `inventory-summary.md`（全量覆盖清单）、`evidence.md`（证据索引，51 条）、`findings.md`（分级发现与待决事项）、`validation.md` + 3 份 `validation-*.log`（检查记录与原始输出）、`knowledge/_scout-*.md`（9 份子代理侦察报告，共约 4,500 行）、`memory-candidates.yaml`（候选与处置）、`writes.jsonl`（写入台账）、`retrieval-checks.md`（回读与检索验收）、`tools/build-inventory.mjs`（清单生成脚本）、`REPORT.md`（本文件）。

### OpenViking 标识

- 项目 peer：`github.com-leike0813-zotero-agents`
- 资源根：`viking://user/default/peers/github.com-leike0813-zotero-agents/resources/`（本次新建，8 份）
- 记忆根：`viking://user/default/peers/github.com-leike0813-zotero-agents/memories/`（本次新增 6 条，另有审计期间自动提取的约 25 个文件）
- 每条资源的完整 URI 见 `writes.jsonl`（未虚构任何标识）

---

## 10. 对工作区产生的实际变化与未解决的限制

### 工作区变化（最终复查：2026-09-16T23:25Z 前后）

```
$ git status --porcelain
?? artifacts/openviking-bootstrap/
?? artifacts/openviking_initialization_guide.md
$ git diff --stat          # 空
$ git diff --cached --stat # 空
$ git rev-parse HEAD       # d75221a75e1e40425edd20c1c5a198c6f1bb6975（未变）
```

- **已跟踪业务文件、测试、文档、依赖清单、锁文件、AGENTS.md、`.gitignore`：零修改。**
- 新增仅为上述未跟踪审计目录（及本任务原有的输入文件）。未修改 `.gitignore` 来掩盖新增文件。
- 被构建/测试写过的既有忽略目录：`rust/synthesis-sidecar/target/`（cargo 测试产物）、`/tmp/zotero-agents-node-test-shards-*`（测试 runner 的临时数据目录）。均为工具自身行为，未触碰真实 Zotero 数据。
- OpenViking 侧：项目 peer 空间新增 8 份资源与 6 条记忆；另有一次写入探测文件已删除。

### 未解决的限制

1. **测试红灯根因未定位。** 只做到「确认 + 排除若干替代解释」，没有 bisect。
2. **动态验证覆盖不全。** 9 个 Node 领域、全部真实 Zotero 层、E2E、lint、clippy、fmt、`npm run build`、parity 脚本均未运行 —— 本次结论在这些方向上**没有**证据支撑。
3. **源码审阅不是全覆盖。** `zoteroHostCapabilityBroker.ts` 约 56% 的行段未逐行审阅；ACP 与 UI 的大量疑点停留在侦察级证据。
4. **子代理报告未经独立复核。** 9 份报告中只有部分关键路径被主会话复核（`evidence.md` 逐条标注「主」/「子」）；引用其路径前建议复核。已知子代理会话中存在 `rg` 输出占位符失真的工具异常。
5. **无法阻止自动提取。** 本会话与全部子代理会话都在被捕获；审计期间的中间结论可能已进入项目记忆，其中已核实存在中间状态残留与指令膨胀（§8）。
6. **凭据暴露事件未能完全补救。** §4.4 的密钥轮换与会话记录复核需由用户执行；本次只能确认它没有进入审计文件与 OpenViking。
7. **未做真实新会话召回验证**（§8）。
8. **CodeGraph 索引由旧引擎建立**，可能缺边；未重建。

### 最后

本次审计在**已审阅范围及已执行检查中**确认了上述问题；这不代表项目不存在其它缺陷，也不构成「项目绝对安全」的判断。测试通过不等于没有缺陷，未发现调用方也不等于代码无用。
