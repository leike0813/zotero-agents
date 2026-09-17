# retrieval-checks.md — 回读与检索验收

- run_id: `20260916T1450Z`
- 目的：验证写入 OpenViking 的知识能被检索到、归属正确、内容未失真；并暴露召回失败与失真。
- 作用域：全部查询未附加 `target_uri` 限定，即使用**普通项目范围的检索**，不把答案或 URI 塞进查询。
- 判据：**返回材料是否足以支持答案**，不是「我凭本会话记忆能否回答」。
- 限制声明：本环境**无法提供独立的真实新会话端到端验证**。以下是工具检索验收（在本会话内经 MCP 工具完成），**未**完成真实新会话的自动召回验证。因此不能声称所有 harness 的自动注入都会正常工作。

---

## 一、问题集与结果

### Q1 项目用途与主要模块

- 查询：`这个项目是做什么的，主要模块有哪些`
- 返回：`project_knowledge_pack.md`（52%）、`entities/module/.overview.md`（49%）、`ui_frontend_layer.md`（45%）、`resources/.overview.md`（47%）、`skills/.overview.md`（48%）
- 判据：**足以支持答案**。`project_knowledge_pack.md` 直接给出资源清单与用途；`resources/.overview.md` 的自动摘要准确概括了项目定位（Zotero Agents 插件 v0.9.0、面向 Zotero 7/9/10、可插拔工作流）。
- 归属：全部为 `peers/github.com-leike0813-zotero-agents/` 前缀 → 正确。
- 备注：`project-overview.md` 本体未被本次查询召回（在 Q2 的返回里以 68% 出现），属排名问题而非缺失。

### Q2 模块边界与投影纪律

- 查询：`Zotero 宿主能力通过哪一层暴露给工作流包，投影纪律是什么`
- 返回：`module/zotero_host_broker.md`（69%）、`module/workflow_engine.md`（65%）、`resources/host-capability-and-bridge.md`（75%）、`resources/project-overview.md`（68%）、`resources/.overview.md`（64%）
- 判据：**足以支持答案**。`host-capability-and-bridge.md` 的摘要明确写出「broker 语义层 / Host Bridge 远程边界 / MCP 与 CLI 是纯投影 / Workflow Host API 是成员级投影」；`zotero_host_broker.md` 补充了「broker 不负责 authorization/transport/remote locality」。

### Q3 跨模块核心流程

- 查询：`用户在工作流菜单点一次执行后，请求怎么一路走到写入 Zotero`
- 返回：`module/runtime_substrate.md`（60%）、`module/workflow_engine.md`（60%）、`workflow_package/.overview.md`（59%）、`resources/project-overview.md`（63%）、`resources/workflow-engine-and-packages.md`（61%）
- 判据：**可支持答案，但需组合两处**。`workflow_engine.md` 给出调用链 `loadWorkflowManifests → rescanWorkflowRegistry → executeWorkflowRun → runSeam → executeSkillRunnerSequence → applySeam`；`project-overview.md` 给出流程级概述。**没有任何单条记忆呈现完整的端到端流程（含错误与清理路径）** —— 这是本次知识初始化的已知稀疏点。
- 改进动作：未补写。理由：`docs/architecture-flow.md` 已是权威描述，再写一条会形成第二份规范（指南 §9.1 明确避免）。

### Q4 只读安全操作

- 查询：`哪些命令只读安全，跑构建会不会改动工作区文件`
- 返回：`entities/scripts/classification_map.md`（51%）、`resources/build-test-release-operations.md`（51%）、`resources/audit-2026-09-16-confirmed-issues.md`（50%）、`entities/events/2026/09/16/.overview.md`（52%）
- 判据：**足以支持答案**。`classification_map.md` 逐脚本标注读写行为，含「名字是 check 但实际 cargo run」的两处告警；`build-test-release-operations.md` 明确 `npm run build` 第一步会写 `addon/content/help-docs/`。

### Q5 当前版本与旧版本的区分

- 查询：`synthesis 数据库 schema 现在是什么版本，文档里写的是哪个版本`
- 返回：`module/synthesis_stack.md`（61%）、`workflow_package/synthesis-layer.md`（55%）、`preferences/joshua/测试运行约定.md`（52%）、`entities/docs/documentation_drift.md`（51%）、`resources/synthesis-stack.md`（62%）
- 判据：**足以支持答案且区分了版本**。`documentation_drift.md` 明确「代码是 v6、README 与 performance 文档写 v5」；`resources/synthesis-stack.md` 同样记录了这处漂移。

### Q6 硬约束（UI/transcript）

- 查询：`改动 Assistant Workspace 的 transcript 渲染时有哪些硬性约束不能违反`
- 返回：`module/ui_frontend_layer.md`（62%）、`entities/events/.../test_suite_repaired.md`（53%，无关内容：agent-ctl 的另一个项目）、`documentation_drift.md`（53%）、`resources/agent-transports-acp-skillrunner.md`（54%）
- 判据：**足以支持答案**。`ui_frontend_layer.md` 完整列出 managed region、signature 输入、命令式/Preact 分界、cold mirror 键、折叠不进 signature 等约束对应关系。
- **召回噪声**：`test_suite_repaired.md` 是**另一个仓库（chezmoi/agent-ctl）**的用户级记忆被召回。它不以 peer 前缀出现，属用户级 `memories/events/`。这是跨项目噪声，需要读者自行判断归属。记录为 Q6 的缺陷。

### Q7 排错方法（已验证）

- 查询：`canonical mutation 报 prepared mutation no longer matches current Zotero state 怎么查`（同义自然语言，见 F-BEHAV-2 的排错入口）
- 返回：`entities/finding/mutation_staging_stale_error.md` + `resources/audit-2026-09-16-confirmed-issues.md`（在 Q5/Q4 的返回中也可见）
- 判据：**足以支持答案**。该记忆给出消息的唯一产出点、被降级的分类形态、出现面与 `recheck_when`。

### Q8 历史依据（动机类，正确结果应为「未记录」）

- 查询：`为什么 ZoteroHostCapabilityBroker 做成一个一万八千行的单文件，当初的设计理由是什么`
- 返回：`module/zotero_host_broker.md`（83%）、`resources/host-capability-and-bridge.md`（80%）、`resources/project-overview.md`（67%）、`resources/.overview.md`（66%）
- 判据：**返回材料只描述结构事实（行数、区块划分、重复样板计数），未给出任何设计动机**。这正是期望结果 —— 仓库只有 1 篇 ADR（`docs/adr/0001-repository-ownership-layout.md`），且不涉及该文件的拆分决策。正确回答是「动机未记录 / 未核实」。
- 反例检查：**没有任何返回内容编造动机**（未出现「为了保证原子性所以合并」这类叙述）。通过。

### Q9 证据不足（正确结果应为「不知道 / 需核查」）

- 查询：`CI 里有没有代码覆盖率门槛，要求多少百分比`
- 返回：`entities/ci/pr_release_gates.md`（52%）、`resources/audit-2026-09-16-confirmed-issues.md`（47%）、无关的用户级记忆
- 判据：**部分支持**。`pr_release_gates.md` 完整枚举了 6 项门禁（localization / ssot / host-bridge-content / synthesis-native-stage1 / test-node / test-zotero-lite|full），其中**没有任何覆盖率项**。因此可以据此得出「没有覆盖率门槛」，但这是**清单枚举式的间接证据**，不是一条显式的否定记录。读者若只看摘要，可能误以为「清单不全所以可能有」。
- 处置：不改写。理由：为「不存在」写一条记忆会制造无用条目（指南 §9.2 第 3 条）。

---

## 二、回读检查（内容保真）

对本次写入的关键条目做了回读抽查：

| 条目 | 回读方式 | 结果 |
|---|---|---|
| `resources/project-overview.md` | `read` 前 20 行 | 与写入内容逐字一致；`as_of`、`evidence_type`、`verification` 三个限定字段完整保留 |
| 其余 7 份资源 | `list -r`（由插件自动生成 `.overview.md` 摘要） | 全部存在；自动摘要对每份资源的内容概括准确（未出现事实性改写） |
| `memories/entities/verification/baseline_verification_2026_09_16.md` 等 6 条记忆 | `find` 命中 + 摘要核对 | 命中正常；未见把「推测」写成「必然」的失真 |
| 探测文件 `memories/entities/_write-probe.md` | `forget` 后 `list` | 已删除，无残留 |

发现的失真与问题：

1. **自动生成的 `resources/.overview.md` 与逐份资源摘要为英文**，而原文以中文为主。属摘要语言选择问题，不影响事实准确性。未修正（修改自动生成文件超出本次边界）。
2. **自动提取的记忆里存在中间过程残留**：`memories/entities/module/synthesis_stack.md` 末尾有一句「`artifacts/openviking-bootstrap/.../\_scout-synthesis.md` 已写入第一部分…第二部分尚未完成 → 父 agent 续写」。这是子代理会话**工作过程中的状态**被当成知识提取。它污染了该条记忆的可靠性尾部。
   - 处置：**本次不修改该文件**（它由自动提取创建，不属于本次任务明确归属的产物；指南 §10.3 要求「只管理本次任务明确归属的产物，不得覆盖未知来源的重要记录」）。在此记录为需人工或后续会话处理的问题。
3. **自动提取把任务指令折进了偏好记忆**：`memories/preferences/joshua/测试运行约定.md` 已从 3 条偏好膨胀为包含当次侦察范围、产出路径、各模块约束的清单式内容；其中还保留了「跨层桥接测试若不可避免地落在 `tests/core/` 或 `tests/node/core/`」这一**沿用了 AGENTS.md 漂移表述**的句子，把不存在的目录写进了偏好记忆。
   - 处置：同上，不修改；记录为失真。
4. **同一事实在不同来源出现分歧**：`module/zotero_host_broker.md` 记 broker 的 `library` 域为 16，另一份侦察会话记为 18。本次资源的写法回避了逐域计数（只写区间 `:529-762`），因此未把分歧固化。
   - 处置：分歧保留，未擅自选一个版本当真（指南 §9.5）。

---

## 三、项目归属与版本正确性

- 所有本次写入的条目 URI 均位于 `viking://user/default/peers/github.com-leike0813-zotero-agents/` 之下 → **项目归属正确**。
- 每份资源与记忆都带 `as_of: HEAD d75221a75e1e40425edd20c1c5a198c6f1bb6975`（或会话标识）与 `recheck_when` → **版本与条件未丢失**。
- 本次**没有**写入任何用户级偏好、身份或跨项目约束；本次新增的 6 条记忆全部落在项目 peer 空间。
- 唯一一次写入用户级空间的尝试不存在；探测文件写在项目 peer 空间并已删除。

---

## 四、未通过 / 未完成项

| 项 | 状态 | 说明 |
|---|---|---|
| 真实新会话端到端召回验证 | **未完成** | 本环境无法提供独立会话。已完成的只是工具检索验收 |
| 自动提取记忆的中间状态污染（§二.2） | **未修正** | 不属本次归属产物，未覆盖 |
| 偏好记忆被指令内容膨胀并沿用文档漂移（§二.3） | **未修正** | 同上 |
| 跨项目召回噪声（Q6） | **已记录未解决** | 用户级 `memories/events/` 的其它项目事件会被召回；`peer_scope` 未限定 |
| 单条端到端流程记忆的缺失（Q3） | **有意不补** | 避免与 `docs/architecture-flow.md` 形成第二份规范 |
| 「不存在」类问题的显式否定记录（Q9） | **有意不补** | 避免制造无复用价值的条目 |

## 五、结论

- 检索可用：9 个自然语言问题中，**7 个返回材料足以支持答案**，1 个（Q8 动机）正确地「无材料可编造」，1 个（Q9）为清单枚举式间接证据。
- 归属正确、版本字段完整、未生成跨项目或用户偏好条目。
- 已知失真 3 处（自动摘要语言、自动提取的中间状态残留、偏好记忆膨胀），均来自**自动提取管线**而非本次手工写入的条目。
- **未完成真实新会话端到端验证**，不得据此声称所有 harness 的自动召回均已验证。
