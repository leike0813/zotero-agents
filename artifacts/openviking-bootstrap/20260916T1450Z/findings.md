# findings.md — 确认问题、疑点与待决事项

- run_id: `20260916T1450Z`
- 基线：HEAD `d75221a75e1e40425edd20c1c5a198c6f1bb6975`；工作区除本任务输入外无改动。
- 分级口径：
  - **confirmed**：证据闭合。标注 `runtime`（实际执行得到）或 `static`（静态闭合推导，未运行复现）。
  - **suspected**：有证据指向但未闭合（可达性、上游保证、替代解释未排除）。
  - **needs-decision**：事实清楚，但取舍需要用户或更强模型决定，本次不擅自处理。
  - **doc-drift**：文档与当前实现不一致。

> 本次审计只提出最小范围的候选处理方向，未做任何修复。
> **验证身份说明**：标「本次已独立复核」的条目由主审计者在主会话中直接读取源码或执行命令核实；标「侦察报告，未独立复核」的条目来自子代理报告，按指南 §12.2 只作为待核查材料。

---

## 一、功能与行为

### F-BEHAV-1 【confirmed / runtime】跨领域 Node 测试在本次基线上失败，且失败集中在 canonical mutation 的 staging 校验

- 状态：confirmed（runtime）
- 影响：在当前工作区，`zotero-host` 与 `workflow` 两个 Node 领域的既有测试无法全绿。任何以「测试全绿」为前提的交付判断在此基线上不成立。
- 证据：
  - `npx tsx scripts/run-node-test-shards.ts --domain zotero-host` → runner 退出码 1；`tests/zotero-host/102-zotero-host-broker-capability-api.test.ts` 9 个失败（同一文件），`tests/zotero-host/130-zotero9-compatibility.test.ts` 1–2 个 2000 ms 超时（两次运行数量不同 → 不稳定）。日志：`validation-zotero-host-domain.log`。
  - `npx tsx scripts/run-node-test-shards.ts --domain workflow` → 退出码 1；分片结果 `workflow-engine exit=6`、`workflow-packages-literature exit=38`、`workflow-packages-workbench exit=18`、`workflow-packages-tags exit=1`（`workflow-host exit=0`），合计 **63 个失败**。日志：`validation-workflow-domain.log`。
  - 反复出现的断言形态：`expected 'failed' to equal 'committed'`、`expected 'repair_required' to equal 'committed'`、`expected +0 to equal 1`、`expected [ {…} ] to have a length of 2 but got 1`。
  - 反复出现的错误体：`{"code":"execution_failed","phase":"staging","recovery":"retry_same_operation","message":"prepared mutation no longer matches current Zotero state","details":{"phase":"staging","recovery":"retry_same_operation"}}`，出现在 `102-zotero-host-broker-capability-api.test.ts:1994`、`tests/workflow-tag-regulator/64-workflow-tag-regulator.shared.ts:310` 等处。
  - 失败栈显示错误从工作流包 hook 抛出：`workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:70`，经 `src/workflows/runtime.ts` 上抛（`89-workflow-debug-probe.test.ts:835`）。
- 触发条件与可达性：`requestKind` 为 skillrunner/ACP 的写入型工作流（`literature_artifact.upsert_digest` 等 managed note 写入）在 mock 宿主下触发；`workflow-host` 分片全绿，说明不是 host-api 投影本身的问题。
- 已检查的替代解释：
  - 不是环境缺失（同一次运行中 `workflow-host` 8 文件全绿）。
  - 不是「已知的有意红状态」：本分支最新提交 `d75221a7 research(e2e-wayfinder): catalog historical cross-boundary regressions for issue #43` 的产物 `artifacts/e2e-wayfinder/historical-cross-boundary-regressions.md` 中没有提到这些文件或断言（本次已 `grep` 复核）。
  - 不是纯超时假象：`102` 的 9 个失败是断言失败，不是超时。
- 未完成：**未做根因定位**。`git bisect`、回退提交或改工作区状态都超出本次只读边界。
- 候选处理方向（不实施）：对 `tests/workflows/89-workflow-debug-probe.test.ts` 的单个失败用例做一次交互式调试；或对 `80f9b5a8`（引入 `assertPreparedMutationEntityObservations`）与 `264b5336`（改动该断言）两点之间的历史做只读对比。
- 需决定：这是「产品缺陷」还是「mock/authority 语义在近期重构后未对齐」。两者处置方式不同，本次不代为判断。

### F-BEHAV-2 【confirmed / static】staging 阶段存在把「不可重试的冲突」降级为「可重试失败」的错误包装

- 状态：confirmed（static，理由闭合：消息字面量唯一 + 包装形态唯一匹配）
- 影响：调用方按 `recovery` 字段决定后续动作。原本要求 `refresh_and_retry_new_operation`（刷新后以新操作重试）的 stale 冲突，被改写成 `retry_same_operation`（用同一操作重试）。按新分类重试，会用同一份已失效的 prepared 输入再次撞上同一冲突：既得错误结论，也可能造成重复副作用。
- 证据（本次已独立复核）：
  - 消息 `"prepared mutation no longer matches current Zotero state"` 在整个 `src/` 中**只有一处**产出：`src/modules/zoteroHostCapabilityBroker.ts:14298` `preparedMutationStaleError()`，其分类为 `status="failed"`、`code="conflict"`、`phase="read"`、`recovery="refresh_and_retry_new_operation"`、`details={reason:"revision_mismatch"}`（`:14298-14306`）。
  - 而失败运行中记录到的 attempt 是 `code=execution_failed`、`phase=staging`、`recovery=retry_same_operation`、`details={phase:"staging",recovery:"retry_same_operation"}`、`affectedRefs=[{kind:"item",ref:{libraryId:1,key:"00000002"}}]`、`residualRefs=[]`。
  - `MutationAuthorityExecutionError` 的构造参数顺序为 `(status, code, phase, recovery, details, message, affectedRefs, residualRefs)`（`src/modules/zoteroHostMutationAuthority.ts:109-125`）。
  - 与之完全一致的包装形态出现在 `:5207-5209`（`failed / execution_failed / staging / retry_same_operation / {phase,recovery}`）、`:11339-11341`、`:12407-12409`、`:12421-12423`、`:12655-12658`。其中 `:5200-5225`（`upsertNotePayloadAttachment` 的 staging catch，`:5072` 起）**保留内层 `error.message` 并把 affectedRefs 设为单个 item ref**，与观测到的 attempt 完全同形；而 `:12406`、`:12418`、`:11315` 三处同类包装都带 `if (error instanceof MutationAuthorityExecutionError) throw error;` 保护，`:5200` 处**没有**。
- 已知限制：**未证明**失败测试必然经过 `:5200`（同形的包装点有 5 处）。这是一个静态可闭合的分类缺陷，与 F-BEHAV-1 的根因是否同一件事尚未确定。
- 候选处理方向（不实施）：把 `:5200` 的 catch 与兄弟实现对齐，补 `instanceof MutationAuthorityExecutionError` 直通；并复核其余 4 处同类包装是否需要同样保护。

### F-BEHAV-3 【suspected / static】`workflowWorkspacesByRunId` 在生产路径没有清理入口

- 状态：suspected（可达性窄，已排除「每个 workflow run 都写」这一更强假设）
- 影响：`src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:52` 的模块级 `Map`，写入点 `:152`（恢复注册）与 `:217`（`workflowWorkspace.mode === "new"`）。唯一清理是 `resetAcpWorkflowWorkspaceRegistryForTests()`（`:159`）——测试专用。每个条目持有 `workspaceDir`、`runtimeDir` 与一个 `namespaceCountsBySkillId: Map`。
- 可达性核查（本次已独立复核）：在整个仓库中搜索 `mode: "new"` 的产生者，**只有测试文件**（`tests/skillrunner/107`、`tests/skillrunner/154`、`tests/synthesis/155`、`tests/workflows/156`）与 `acpSkillRunnerWorkspace.ts:41` 的类型声明；`src/` 与内容包中没有任何生产者。因此 `:217` 分支在生产中不可达，唯一生产写入来自 `registerAcpWorkflowWorkspaceForReuse`（调用点 `acpSkillRunRecovery.ts:522`），即**恢复路径**。
- 判读：不是「每次运行都泄漏」，而是「每次用户触发的恢复注册一条、会话内不释放」。单条很小。列为 low 级 suspected，不作为高风险问题。
- 需决定：是否值得加一条按 run 终态的释放；或明确该注册表只在恢复窗口内有意义。

### F-BEHAV-4 【confirmed / static】SkillRunner 路径丢弃 `poll.timeout_ms`

- 状态：confirmed（static）
- 影响：工作流可声明 `request.poll.timeout_ms`。`generic-http` 路径消费它（`src/providers/generic-http/provider.ts:623`，默认 600000），`src/providers/skillrunner/` 下**零命中**；`src/providers/skillrunner/client.ts:1284-1286` 只透传 `interval_ms`。声明了该字段的 skillrunner 工作流不会得到它承诺的轮询超时。
- 附加（侦察报告，未独立复核）：`executePollStep` 的轮询循环本地无墙钟上限，只在终态或 waiting 返回。
- 候选处理方向（不实施）：确认该字段是否是 skillrunner 契约的一部分；是则消费它，否则从契约中移除，避免公开一个静默无效的字段。
- **本次已独立复核**：`grep "timeout_ms" src/providers/skillrunner/*.ts` → 0 命中；`generic-http/provider.ts:623` 命中。

### F-BEHAV-5 【confirmed / static】`runDialogMap` 只增不删

- 状态：confirmed（static）
- 影响：`src/modules/skillRunner/surface/skillRunnerRunDialog.ts:411` 的 `runDialogMap`，唯一写入 `:4556`，唯一清空 `:4120`（shutdown 路径 `clear`），**没有逐条 delete**。每个 entry 最多持有 500 条消息，因此随「本会话中被选中过的 run 数」单调增长。
- 证据（本次已独立复核）：`grep -n "runDialogMap"` 的全部命中为 `411 / 4042 / 4054 / 4068 / 4120(clear) / 4483 / 4539 / 4556(set) / 4947 / 4953`，无 delete。
- 候选处理方向（不实施）：确认 `:4120` 的触发频率（是否每次关闭对话框都清空）；若只在插件卸载触发，则考虑按 run 终态或 LRU 淘汰。

---

## 二、文档与实现不一致（doc-drift）

### F-DOC-1 【confirmed / static】发布清单记录的 CLI 构建输入路径已全部失效，且预构建新鲜度门禁实际失败

- 状态：confirmed（runtime + static）
- 影响：`releases/host-bridge/cli-release.json` 的 `fingerprintInputs` 指向 `cli/zotero-bridge/*`、`host-bridge/contracts/*.json`、`schemas/host-bridge-*.schema.json`；这些路径在当前树中**全部不存在**（实际是 `rust/zotero-bridge/*`、`contracts/host-bridge/*`），与提交 `cbf1356c refactor: major workspace and file structure refactor` 的目录搬迁一致。
- 动态证据（本次执行）：`node scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs` → 退出码 1，
  `{"ok":false,"code":"host_bridge_cli_fingerprint_stale","details":{"manifestFingerprint":"2ef15640bcf10945895ab4a1daa65e89337d6f99978316278c8aa4b1ecb4b4c1","currentFingerprint":"775433cad2bd211d257ba6dee9a5fe2d59a00b20af8b884745954c4555b71e17"}}`
- 对照组（本次执行）：`npm run check:synthesis-sidecar-runtime-freshness` → 退出码 0，`buildFingerprint=e6eef533…`，七个平台齐全。即：Synthesis sidecar 预构建新鲜，Host Bridge CLI 预构建不新鲜。
- 判读：`addon/bin/**` 中随包分发的 Host Bridge CLI 二进制不对应当前源码输入；Host Bridge 发布需要一次 source-fresh prebuild。**这与 AGENTS.md 的发布硬约束一致**（预构建是发布前置），因此不是违规，而是「当前状态尚未满足发布前置」。
- 需决定：是否需要在本任务之外安排重新预构建。

### F-DOC-2 【confirmed / static】根 `AGENTS.md` 的目录结构章节记录了不存在的路径

- 状态：confirmed（static，本次已独立复核）
- `tests/core/`、`tests/node/core/` 不存在（`ls` 实测）；实际 Node 测试按所有权域分布在 `tests/{acp,assistant,dashboard,host-bridge,runtime,skillrunner,synthesis,tooling,ui,workflow*,zotero-host}`，这一布局由 `docs/testing-framework.md` 与 `scripts/run-node-test-shards.ts` 正确描述。
- `src/handlers/` 不存在（`find src` 实测）；Handler 注册已并入 `src/modules/**` 与 `src/workflows/**`。
- 判读：`AGENTS.md` 是约束文件而非说明文档，路径失准会误导后续 agent 的搜索与判断。**本次不修改**（指南禁止改 AGENTS.md）。
- 需决定：由用户决定是否更新该章节。

### F-DOC-3 【confirmed / static】`docs/dev_guide.md` 的组件清单与日志窗口描述已过时

- 状态：confirmed（static，本次已独立复核）
- §3 列出的 `src/modules/*Dialog.ts`（「设置/Dashboard/日志窗口」）在 `src/modules/` 下**不存在**任何 `*Dialog.ts` 文件；§8「日志窗口当前能力：独立日志窗口（右键菜单可打开）」也已过时——`openLogViewer` 现在路由到 Dashboard 的 `runtime-logs` 标签（`src/hooks.ts:1515-1519` → `openTaskDashboard({initialTabKey:"runtime-logs"})`）。
- §3 同时写「`src/transport/` 当前未启用」；该目录不存在（措辞为「未启用」而非「不存在」，属轻微不精确）。
- 其余大量路径（`selectionContext.ts`、`jobQueue/manager.ts`、`dashboardHost.ts`、skillRunner 各入口等）**均存在**，说明该文档整体仍具参考价值，问题局限于上述几条。

### F-DOC-4 【confirmed / static】Synthesis 仓库 foundation 版本号在文档中落后一代

- 状态：confirmed（static，本次已独立复核）
- 代码：`rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:32` → `SCHEMA_VERSION = "synthesis-repository-foundation.v6"`。
- 文档：`docs/synthesis-layer/README.md:152` 与 `:173`、`docs/synthesis-layer/performance-and-scale.md:51` 仍写 foundation **v5**。同一目录的 `docs/synthesis-layer/persistence-and-files.md:81,99` 已正确写 v6。
- 附带事实：表/索引计数仍然吻合 —— `crates/synthesis-repository/src/schema.sql` 实测 `CREATE TABLE` 62 处、`CREATE INDEX` 51 处，与文档「62 tables and 51 indexes」一致。所以漂移只在版本标签，不在规模描述。

### F-DOC-5 【confirmed / static】发布的 harness 页面含指向被排除文件的死链

- 状态：confirmed（static，本次已独立复核）
- `addon/content/harness/index.html:13,16` 链接 `/content/harness/prototype-workspace.html` 与 `/content/harness/prototype-source-switching.html`；
- `zotero-plugin.config.ts:190-191` 明确把它们从打包资源中排除（`!addon/content/harness/prototype-*.html`、`!addon/content/harness/prototype-*.bundle.js`）。
- 判读：仓库内可用、发布包内死链。harness 是只读测试页面，影响面小。

### F-DOC-6 【confirmed / static】OpenSpec 规格中 139/364 的 `Purpose` 仍是归档占位符

- 状态：confirmed（static，本次已独立复核）
- `openspec/specs/` 共 364 个 spec，其中 139 个的 `## Purpose` 段落仍是 `TBD - created by archiving change …`。364 个 spec 全部含至少一条 `### Requirement:`，`### Requirement:` 总数 3,240。
- 判读：属文档完整度问题，不是功能缺陷。规格的**要求**部分是可用的；不可用的只有概述段。

---

## 三、安全与信任边界

### F-SEC-1 【confirmed / 操作事故】审计过程中因脱敏正则未覆盖 `root_api_key` 键名，导致 OpenViking 服务端密钥明文出现在一次工具输出中

- 状态：confirmed（本次实际操作事故，由本次审计自己造成）
- 经过：为核实「OpenViking 配置里 autoRecall/autoCapture 的实际归属」，我用 Node 脚本按键名脱敏打印了 `~/.openviking/ov.conf` 的结构。脱敏正则写作 `(key|token|secret|password)\s*[:=]\s*\S+`，只匹配 `key:` 形式；JSON 中是 `"root_api_key": "…"`，键名与冒号之间隔着引号，因此未命中，密钥值被完整打印。
- 影响与已核实边界：
  - 密钥值**没有**写入本次审计的任何文件（`grep` 复核审计目录，见下）；
  - 密钥值**没有**写入 OpenViking；
  - 该输出进入了本会话。本会话**正在被自动捕获**（`peer_id=github.com-leike0813-zotero-agents`，`~/.openviking/data/viking/default/user/default/sessions/dsh-a171cd1d-…/messages.jsonl`），因此该值可能随会话记录落盘，并可能被语义提取进记忆。**这一点无法由本会话撤回或阻止。**
  - 复核命令与结果：`grep -r "<该密钥前 8 位>" artifacts/openviking-bootstrap/20260916T1450Z/` → 0 命中（此处不复现明文）。
- 处置建议（**需用户执行，本次不代做**）：
  1. 在 OpenViking 服务端轮换 `root_api_key`；
  2. 复核 `~/.openviking/data/viking/default/user/default/sessions/dsh-a171cd1d-3596-4461-b2fe-c723c85ffe12/` 下已捕获内容，必要时删除该会话记录；
  3. 检查当日是否有已提取的记忆包含该值。
- 教训（值得写入记忆）：**按键名脱敏不能覆盖 free-text/JSON 打印**。如需展示配置文件结构，应改为白名单式输出（只打印允许的键名与类型），而不是黑名单正则。

### F-SEC-2 【suspected / static】运行时日志的脱敏只按「键名提示」生效，字符串值本身不做模式扫描

- 状态：suspected
- 影响：`src/modules/runtimeLogManager.ts` 的 `sanitizeValue` 仅在 `keyHint` 命中 `SENSITIVE_KEY`（`authorization|token|secret|password|api[-_]?key|cookie|bearer`）或 `PRIVATE_LOCATION_KEY`（`path|stack|cause|url|uri|location`）时替换为 `<redacted>`（`:367-369`、`:438-443`）；字符串值只做长度截断（`sanitizeString`，`:425-430`）。`message` 只经过 `sanitizeString`（`:778`），错误消息同样（`:789`）。全仓搜索未发现任何「按内容模式脱敏」（`redactSensitive`/`scrubSecret`/`maskToken` 之类）的通用 helper；唯一的 `maskToken` 在 `hostBridge/mcp/zoteroMcpServer.ts:515`，只用于 Host Bridge token 展示。
- 已检查的保护机制：
  - 键名黑名单覆盖了常见的敏感键（含 `baseUrl` 因含 `url` 而被整体抹掉）；
  - `normalizeTransport` 的 `url` 字段（`:642-676`）**不在**键名脱敏路径上（它是显式字段，不经过 `sanitizeValue`），但生产 `transport.url` 目前只来自 `buildUrl`（base + path），未见拼接凭据；
  - MCP 侧对 `query.token` 有专门处理（`sanitizePathForDiagnostics` → `?token=<redacted>`），授权头只记录布尔事实（`requestHeaderFacts`）。
- 未闭合的部分：**没有找到**一条实际会把凭据放进 `message` 或非敏感 `details` 键的调用点，因此「是否真的会泄漏」未证实。
- 候选处理方向（不实施）：若要强化，应在 `sanitizeString` 层级加一条极窄的内容模式（例如 URL userinfo 与已知 token 前缀），并同时覆盖 `message` 与 `error.message`；但这会引入误伤风险，需要权衡。
- 需决定：是否值得加固，以及加固的边界。

---

## 四、重复实现与死代码（工程一致性，非功能缺陷）

### F-DUP-1 【confirmed / static】「100 items / 50 ms 让出宿主槽」的策略值在三处各自定义

- `src/modules/zoteroHostCapabilityBroker.ts:17838`（`shouldYieldHostSlice`）——本次已独立复核所在区块；
- `src/modules/zoteroHost/libraryArtifactReadiness.ts:283`——内联字面量 `processed >= 100 || Date.now() - startedAt >= 50`；
- `src/modules/zoteroHost/zoteroNotePayloadResolver.ts:218-219`——具名常量 `PAYLOAD_READ_YIELD_ITEMS = 100` / `PAYLOAD_READ_YIELD_MS = 50`。
- 值目前一致，但无单一来源；改一处不会带动另两处。

### F-DUP-2 【confirmed / static】SkillRunner 的 500 条会话上限在两处重复

- 状态：confirmed（侦察报告 + 本次独立复核定位）
- `src/modules/skillRunner/surface/skillRunnerRunDialog.ts:1354-1355` 与 `:3229-3230` 各写一次 `slice(-500)`。该值与 AGENTS.md 硬约束中「有界的内存会话历史（上限 500 条）」对应，属应当单点化的常量。

### F-DUP-3 【confirmed / static】`src/shared/preactRegionMount.ts` 的 `shouldManageRegion` 无引用，且与 sidebar 侧同名实现重复

- 状态：confirmed（static，本次已独立复核）
- `src/shared/preactRegionMount.ts:66` 导出 `shouldManageRegion`，全仓外部引用为 0（同文件内其余导出 `ensureRegionMount` 16 处、`markPageRegion` 8 处）。
- `src/sidebar/assistantPanelRenderer.js:47` 另有一份同名局部实现并在 `:140` 导出；导出的 5 个符号中 `shouldManageRegion` 在 `src/` 与 `tests/` 内也无外部消费者。
- 判读：一处死导出 + 一处同语义重复实现。

### F-DUP-4 【suspected】Chat 与 SkillRun 各有一套 transcript 镜像与权限队列实现

- 状态：suspected（侦察报告，未独立复核）
- 指向：`chat/acpChatTranscriptMirror.ts`（792 行）与 `skillRun/acpSkillRunTranscriptMirror.ts`（1439 行）各自持有冷镜像 LRU 常量（值都是 10）、分页默认/上限与 prune 函数；`skillRun/acpPermissionQueue.ts`（通用类）与 `skillRun/acpSkillRunPermissionQueue.ts`（模块级函数 + 状态）并存。
- 与硬约束的关系：AGENTS.md 要求 ACP Chat 与 ACP Skills 共享同一套 transcript **边界分类**（这一点侦察报告确认成立，分类器是纯函数、无后端特判）；镜像缓存不在该约束范围内，因此重复本身不违规，只是维护面翻倍。
- 需决定：是否有意为之（两条路径的 owner 键与生命周期确实不同：Chat 用 `backendId+conversationId`，Skills 用 `requestId`）。

### F-DUP-5 【confirmed / static】同一个 pref 键常量在两个模块各自定义

- 状态：confirmed（static，本次已独立复核）
- `src/backends/registry.ts:29` 与 `src/modules/workflow/settings/workflowSettings.ts:71` 各自定义 `WORKFLOW_SETTINGS_PREF_KEY = "workflowSettingsJson"`，并各自读写同一 pref。键值是唯一事实，但常量有两个来源。

---

## 五、资源生命周期与容量

### F-LIFE-1 【confirmed / static】插件 shutdown 的单步 3 秒超时是「放弃等待」而非「取消」

- 状态：confirmed（static，本次已独立复核）
- `src/hooks.ts:1106` `PLUGIN_SHUTDOWN_STEP_TIMEOUT_MS = 3_000`；`runShutdownStepWithTimeout` 用 `Promise.race` 等待，超时后**只记录告警并继续**，被放弃的任务仍在运行；`onShutdown` 末尾会执行 `delete Zotero[addon.data.config.addonInstance]` 并把 `addon.data.alive` 置 false。
- 影响：超时步骤（例如 `host-bridge-supervisor-stop`、`zotero-mcp-shutdown`）可能在 addon 已被移除后继续执行清理，或被进程退出直接截断。这是**有意的有界关停**设计（避免卸载挂死），代价是清理不保证完成。
- 已检查的保护：每个步骤独立超时，避免单点拖死整个卸载；超时会写 `appendRuntimeLog` 与 verbose console，可观测。
- 附带小事实：`Promise.race` 中的 `setTimeout` 在任务先完成时不会被清除，会多存活最多 3 秒（无实际危害）。
- 需决定：是否需要把「被放弃的清理步骤」升级为可见诊断（当前只是 warn 级日志）。

### F-LIFE-2 【confirmed / static】受管本地 SkillRunner runtime 在插件卸载时只释放租约、不停止进程

- 状态：confirmed（static，本次已独立复核）
- `onShutdown` → `shutdownSkillRunnerAsyncLifecycle()` → `releaseManagedLocalRuntimeLeaseOnShutdown()` + `stopManagedLocalRuntimeAutoEnsureLoop()`（`src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts:44-58`）。真正停进程的 `stopLocalRuntime()`（`skillRunnerLocalRuntimeManager.ts:4313`）只挂在 UI 动作上（`src/hooks.ts:1929`）。
- 判读：这是**租约模型的有意设计** —— 本地 runtime 是跨 Zotero 会话共享的长生命周期服务，卸载时交还租约而不是杀掉它，由 runtime 侧按租约决定何时退出。不是缺陷。此处记录是因为它容易被误读成「关停不彻底」。
- 适用前提：`/v1/local-runtime/lease/*` 端点存在且 runtime 侧按租约退出。若 runtime 侧不实现该语义，就会留下孤儿进程 —— 该前提本次**未验证**。

### F-LIFE-3 【suspected】canonical mutation 的终态记录只做惰性过期，无后台清理

- 状态：suspected（侦察报告，未独立复核）
- 指向：`src/modules/zoteroHostMutationAuthority.ts:523-570` 与 `src/modules/pluginStateStore/mutationAuthorityTable.ts:127-148`；30 天后只把 evidence 降级为 `identity_only`；`unknown`/`repair_required` 永不按龄删除（与 AGENTS.md 硬约束一致）；清理只在下次访问时发生。
- 与硬约束的关系：AGENTS.md 明确「普通终态证据保留 30 天后只清 evidence，永久保留 identity binding；unknown/repair_required 不按龄删除」。因此「不删除 identity」是**要求**，不是问题；只有「无后台清理任务、长期运行累积 `identity_only` 行」这一点属容量观察。
- 需决定：是否需要实测长期行数增长；本次无运行环境可测。

### F-LIFE-4 【suspected】受管工作区路径的删除是 fire-and-forget

- 状态：suspected（侦察报告，未独立复核）
- 指向：`src/modules/acp/chat/acpConversationStore.ts:484` 使用 `void removeRuntimePath(conversationStorageDir)`，删除失败不会反馈给调用方；同一函数上方刚做完 SQLite 行删除（`:472`）。
- 影响：会话行已删但目录残留时，没有任何错误路径把它关联回这次删除操作。属「部分成功未被观测」，需要确认上层是否有独立的孤儿目录巡检。

---

## 六、覆盖面与门禁

### F-COV-1 【confirmed / static】`addon/` 下手写 JavaScript 既不进 ESLint 也不进 TypeScript 检查

- 状态：confirmed（static，本次已独立复核）
- `eslint.config.mjs` 的 ignores 含 `addon/content/**` 与 `addon/locale/**` —— 排除的是**整个** `addon/content/`，其中包含手写文件：`content/shared/markdown-renderer.js`、`content/shared/theme.js`、`content/shared/workflow-number-validation.js`、`content/harness/harness-host.js`、`content/sidebar/*.bundle.js`（构建产物）。`addon/bootstrap.js` 与 `addon/prefs.js` 在 ignores 之外，是会被 lint 的。
- `tsconfig.json` 的 `exclude` 含 `"addon"`，因此这些文件也不做类型检查。
- 判读：这是一个**有意的取舍**（共享资产跑在页面上下文、不在插件 sandbox 类型体系内）还是遗漏，需要确认；但「手写共享渲染器无任何静态检查」是事实。

### F-COV-2 【confirmed / static】部分「check」名字的脚本会写盘或需要 Rust nightly

- 状态：confirmed（侦察报告；本次未逐条复核）
- 指向：两个 `check-synthesis-native-*-parity` 实际执行 `cargo +nightly run` 并写 `target/`；`scripts/run-zotero-test-with-mock.ts:22` 的 `DEFAULT_NODE_TARGET_SCRIPT = "test:node:raw"` 在 `package.json` 中不存在（本次已独立复核：`'test:node:raw' in scripts` → false），是一个死默认值。
- 影响：把「check」当成只读检查会导致意外的构建行为；死默认值会在未显式传参时指向不存在的 script。

### F-COV-3 【confirmed / runtime】本次动态验证的实际覆盖面

- 已执行：8 个 TypeScript 项目检查（全通过）、Rust workspace 测试（351 通过 / 0 失败）、Node 的 `zotero-host` 与 `workflow` 两个领域（均失败）、2 个只读新鲜度门禁（1 通过 1 失败）、`--list-shards`。
- **未执行**：其余 9 个 Node 领域、全部 `test:zotero:*`（真实宿主层）、`lint:check`、`cargo clippy`、`cargo fmt --check`、`npm run build`、任何 parity/一致性 check 脚本。
- 因此：**本次没有 lint 证据，没有真实 Zotero 宿主证据，没有 L2/跨语言 parity 证据。** 详见 `validation.md`。

---

## 七、不构成问题的观察（避免误读）

以下条目在本次审计中被核实为**有意设计**，记录在此以免后续被当成缺陷：

1. **受管本地 runtime 跨越插件生命周期存在**（F-LIFE-2）——租约模型。
2. **`unknown` / `repair_required` 记录不按龄删除**（F-LIFE-3）——AGENTS.md 明文要求。
3. **shutdown 有界超时**（F-LIFE-1）——避免卸载挂死。
4. **Chat 与 SkillRun 的 cold mirror LRU 键不同**（`backendId+conversationId` vs `requestId`）——AGENTS.md 明文规定。
5. **SkillRunner 不维护 cold full mirror cache**——AGENTS.md 明文规定，其 500 条内存历史即 mirror。
6. **`zoteroHostCapabilityBroker.ts` 是 18,546 行单文件、内含 1,804 行单函数**（侦察报告）——体量事实，但 AGENTS.md 明确要求它是「Zotero host capability 语义的唯一事实源」；拆分会与硬约束冲突，因此本次不作为问题提出。
7. **页面样式在 `page-chrome.css` 之外仍有原生 hex**（synthesis 51 处 / dashboard 23 处 / page-chrome 7 处）——两页面绝大多数色值走 `var(--zs-*)`（synthesis 317 处、dashboard 135 处），硬约束禁止的是「同名色值」与「私有别名层」，不是禁止一切字面量。

---

## 八、需要用户或更强模型决定的事项（汇总）

| ID | 待决事项 | 为什么本次不代决 |
|---|---|---|
| F-BEHAV-1 | `zotero-host` 与 `workflow` 共 63+10 个失败是产品缺陷还是预期的红状态 | 分支名为 `research/…`，可能是进行中的工作；是否允许红状态属工作流决策 |
| F-BEHAV-2 | 是否修正 staging 包装的错误分类 | 属行为语义变更，需要确认现有调用方是否依赖 `retry_same_operation` |
| F-BEHAV-4 | `poll.timeout_ms` 是补齐实现还是从契约移除 | 属公开契约变更，需要契约 owner 判断 |
| F-BEHAV-3 / F-BEHAV-5 / F-LIFE-3 / F-LIFE-4 | 是否加强内存/残留清理 | 都是 low 级、需要权衡复杂度收益 |
| F-DOC-1 | 是否安排 Host Bridge CLI 重新预构建 | 涉及发布身份与外部构建，指南明确属需授权动作 |
| F-DOC-2 / F-DOC-3 / F-DOC-4 / F-DOC-5 / F-DOC-6 | 是否修正文档漂移 | 指南禁止本次修改 AGENTS.md / 正式设计文档 |
| F-SEC-2 | 是否为日志脱敏增加内容模式 | 有误伤风险，需要安全判断 |
| F-COV-1 | `addon/content` 手写 JS 是否纳入静态检查 | 属工程门禁取舍 |

---

## 九、未决疑点（证据不足，保留不写成结论）

来自子代理报告、本次**未**独立复核的条目，全部作为待核查材料保留，不进入长期记忆：

- `ZoteroHostCapabilityBroker` 的 strict-JSON 断言是否覆盖全部公共读路径出参。
- 宿主槽队列是否真正「进程级」（取决于打包后模块实例数）。
- `assertWorkflowHostStrictJsonValue` 失败抛出的 `TypeError` 是否有统一转换为 `ZoteroHostCapabilityError`。
- `preferenceScript.ts` 的 `bindPrefEvents`（约 2,540 行单函数）是否有行为测试。
- ACP 侧：`acpSharedSkillCatalog.catalogBuildInflight` 并发上限、`activeSyntheticAdapters` 注销路径、`transcriptIndexStates`/`transcriptWriteKeys` 生命周期、semantic trace 各 Map 的异常兜底。
- claude raw-SDK fallback 文本是否绕过 `acpTranscriptBoundary` 的边界分类（若绕过，会与 AGENTS.md 的 transcript 合并约束产生张力）。
- `AcpProvider` 对 `sequence` kind `supports()` 为真但 `execute()` 直接抛错，是否为死分支。
- Workflow Host API 版本在运行时无门禁（仅编译期类型断言 + 内容包 semver）。
- Synthesis discovery 的跨语言 parity 语料仍固定 v2，而生产已是 v5。
- Host Bridge 侧：`cli-commands.v2.json` 无生成器、多份 schema 成孤儿、`check:host-bridge-surface` 未进 PR 门禁。
- `tests/fixtures/selection-context` 下有 23 个被 git 跟踪的 PDF，文件名长度最高 132 字符，形态与论文标题一致；本次**未**打印文件名，也未判断其授权与去标识化状态。该目录不在 AGENTS.md「金例只提交去标识化结构契约」的适用范围内（那条约束针对 `tests/fixtures/zotero-e2e/`），但真实论文二进制入库仍值得单独确认。

## 十、审计过程中的工具异常

- **子代理会话中的 `rg` 输出失真**：Host Bridge 侦察子代理报告，其会话内 `rg` 会把匹配到的部分字串渲染成占位符（例如含 `acp-ws-bridge` 的模式输出为 `host-bridge.n`），并已改用 `grep`/`read` 复核。主会话本次未复现该现象。**影响**：来自子代理报告的文件名/路径若出现异常短名（`n.exe`、`rust/n/...`），应视为渲染失真而非真实路径。本次进入知识包的路径均已在主会话用 `grep`/`read`/`ls` 复核。
