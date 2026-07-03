# ACP Runtime Memory and State Machine Review

审核日期：2026-07-03  
审核基点：`c78a4a..当前工作区`  
审核方式：只读静态审核，未修改实现代码，未运行测试。

## 审核范围

本轮审核重点覆盖以下路径：

- ACP Skills controller 生命周期与大闭包释放路径
- `transcript.jsonl` 作为持久化 SSOT、活动 transcript mirror 作为 UI 内存态的实现
- Assistant Workspace 单实例 shell 与读模型
- ACP Skills 状态机与 `doc/acp-skills-state-machine-ssot.md` 的一致性
- ACP Skills 面板、ACP Chat 面板的前端渲染与状态模型
- 新增/修改测试中是否存在死逻辑、死代码或毒测试倾向

## 总体结论

本轮改动的主方向是正确的：

- ACP run record / plugin store 已经基本不再保存大业务 payload。
- ACP Skills transcript 已经转向 `transcript.jsonl` 持久化 SSOT，UI 只保留活动 mirror。
- Assistant Workspace 已经收敛为每个主窗口一个 shell iframe，并在 library / reader 之间移动同一个 DOM 实例。
- ACP Chat 后台 transcript mirror 的释放策略整体合理：前台或 live session 保留，后台 idle session 释放。

但仍有一个与本轮核心目标直接冲突的高优先级问题：`applyResult` 失败后 ACP Skills controller 不会自动释放，仍可能保留执行闭包及其引用的大对象。除此之外，ACP Skills 面板存在 runtime option 变更后不重绘的问题，disconnect 异常路径也可能让状态机卡在 `disconnecting`。

## Findings

### P1: `applyResult` 失败后 ACP Skills controller 不释放，仍可能持有大闭包

`executeAcpSkillRunnerJob` 在输出验证成功后把 run 标为 `applyResultState: "pending"`，并设置 `keepConversationAlive = true`：

- `src/modules/acpSkillRunnerOrchestrator.ts:5222`
- `src/modules/acpSkillRunnerOrchestrator.ts:5269`
- `src/modules/acpSkillRunnerOrchestrator.ts:5450`

因此 finally 中不会调用 `cleanupLiveSession`，controller 会继续注册在 `controllers` Map 中。

workflow apply 失败时会调用：

- `src/modules/workflowExecution/applySeam.ts:834`

```ts
markAcpSkillRunApplyResult({
  requestId: result.requestId,
  state: "failed",
  error: reason,
});
```

但 `markAcpSkillRunApplyResult` 只有 `state === "succeeded"` 分支会 disconnect / unregister controller：

- `src/modules/acpSkillRunStore.ts:4731`
- `src/modules/acpSkillRunStore.ts:4786`

失败分支只写入 `status: "failed"` 和 `applyResultState: "failed"`，不会释放 controller。

这个 controller 是在 `executeAcpSkillRunnerJob` 的局部作用域中创建的：

- `src/modules/acpSkillRunnerOrchestrator.ts:4106`
- `src/modules/acpSkillRunnerOrchestrator.ts:4395`

它会闭包引用 adapter、workspace、materialization、context、runtime options、prompt chain、assistant turn accumulator 等执行期对象。apply 失败后，如果没有用户手动断开或插件 shutdown，这些对象可能长期存活。

这也违反状态机文档约束：

- `doc/acp-skills-state-machine-ssot.md:212`

终态 run (`succeeded | failed | canceled`) 应最终进入 `closed` 或 `ended`。

建议：

- `markAcpSkillRunApplyResult({ state: "failed" })` 也应触发 controller detach / unregister。
- 清理时应保证 record 进入终态一致状态，例如 `activePrompt: false`、`conversationState: "closed"`、`conversationRecoveryState: "available"` 或按不可恢复语义设置为 `unavailable`。
- 增加回归测试覆盖 apply 失败后 `hasAcpSkillRunController(requestId) === false`。

### P2: `disconnectAcpSkillRun` 异常路径可能让状态永久停在 `disconnecting`

`disconnectAcpSkillRun` 先写入：

- `src/modules/acpSkillRunStore.ts:4679`

```ts
connectionActionState: "disconnecting"
```

随后直接：

- `src/modules/acpSkillRunStore.ts:4688`

```ts
await controller.disconnect();
```

只有该 await 正常返回后，才会写入：

- `src/modules/acpSkillRunStore.ts:4693`

```ts
connectionActionState: "idle",
conversationState: "closed",
conversationRecoveryState: "available",
```

如果 adapter cancel / close 抛错，后续状态不会执行，UI 和状态机都可能永久停在 `disconnecting`。

这与文档约束不一致：

- `doc/acp-skills-state-machine-ssot.md:209`
- `doc/acp-skills-state-machine-ssot.md:266`
- `doc/acp-skills-state-machine-ssot.md:372`

建议：

- 使用 `try/finally` 确保本地 controller 最终 unregister，`connectionActionState` 回到 `idle`。
- 异常应记录为 warn/error event，但不应阻塞本地 detach 状态收敛。
- 增加 disconnect 抛错路径测试。

### P2: ACP Skills 面板 runtime 选项变更后可能不重绘

ACP Skills 的 runtime 选项更新路径会写入 run record：

- `src/modules/acpSkillRunStore.ts:4442`
- `src/modules/acpSkillRunStore.ts:4472`
- `src/modules/acpSkillRunStore.ts:4523`

但前端 `buildPanelRenderKey` 没有包含 runtime option 相关字段：

- `addon/content/sidebar/acp-skill-run.js:75`
- `addon/content/sidebar/acp-skill-run.js:92`

如果只变更 mode / model / reasoning，render key 可能保持不变，`renderAssistantPanelRuntime` 会直接 return：

- `addon/content/sidebar/acp-skill-run.js:367`

实际 reply controls 又依赖这些字段：

- `addon/content/shared/assistant/assistant-panel-model.js:3228`
- `addon/content/shared/assistant/assistant-panel-model.js:3459`

ACP Chat 的 render key 已经包含 mode / model / reasoning：

- `addon/content/sidebar/acp-chat.js:230`

因此这是 ACP Skills 面板的遗漏。

建议：

- ACP Skills render key 纳入 `acpModeId`、`acpModelId`、`acpRawModelId`、`acpReasoningEffort`。
- 或纳入 `selectedRuntimeOptions.currentMode/currentDisplayModel/currentReasoningEffort`。
- 同时考虑 logs/details 内容的 revision key，避免详情抽屉打开时内容 stale。

### P3: `interruptAcpSkillRunCurrentTurn` API 可以在 idle connected run 上制造不合法状态

`interruptAcpSkillRunCurrentTurn` 只检查 terminal 和 controller 是否存在：

- `src/modules/acpSkillRunStore.ts:4197`

随后无条件写入：

```ts
status: "waiting_user",
statusReason: "interrupt_turn",
activePrompt: false,
replyState: "idle",
```

UI 侧通常只有 busy run 才显示 interrupt action，但 host bridge / debug 调用仍可绕过 UI，导致一个没有 active prompt 的 connected idle run 被改成 `waiting_user`。

建议：

- 在 store API 层增加 guard：只有 `activePrompt === true` 或 `replyState in submitted|accepted` 时允许 current-turn interrupt。
- 否则返回 no-op 或抛出明确错误。

### P3: Assistant Workspace 没有全库 O(n) 扫描，但 ACP Skills tab 会全量扫 run history

没有发现 Assistant Workspace 扫 Zotero library 或与 Synthesis 页面直接耦合。

attention 计数走 active index：

- `src/modules/assistantWorkspaceSidebar.ts:304`
- `src/modules/taskRuntime.ts:924`
- `src/modules/acpSkillRunStore.ts:4831`

Assistant Workspace shell 也没有直接 import Synthesis 页面模块。

但 ACP Skills tab 的 snapshot 构造会调用不带 `activeOnly` 的 `listAcpSkillRunSummaries`：

- `src/modules/acpSkillRunStore.ts:5075`
- `src/modules/acpSkillRunStore.ts:5186`

该函数在非 activeOnly 情况下会遍历 `runRecords.values()` 并排序：

- `src/modules/acpSkillRunStore.ts:4847`
- `src/modules/acpSkillRunStore.ts:4854`

这不是全库扫描，但长期运行产生大量 run history 后，ACP Skills tab 打开或刷新会退化为 O(number of all ACP run records)。

建议：

- 为 ACP Skills panel 增加 recent-run index，或在持久层维护最近 N 条可见 run。
- `prepareAcpSkillRunPanelSnapshot` 应避免为了展示最近 100 条而每次全量排序。

### P3: 测试中存在毒测试倾向

`test/core/171-acp-runtime-memory-governance.test.ts` 中关于 runtime file 外置、store 不保留大 payload、selected snapshot 只暴露必要 transcript 的行为测试是有价值的。

但 `test/core/97-acp-ui-smoke.test.ts` 大量直接读取源码并断言具体字符串、函数名、CSS 片段、完整本地化文案：

- `test/core/97-acp-ui-smoke.test.ts:248`
- `test/core/97-acp-ui-smoke.test.ts:1005`
- `test/core/97-acp-ui-smoke.test.ts:1235`
- `test/core/97-acp-ui-smoke.test.ts:2570`
- `test/core/97-acp-ui-smoke.test.ts:2766`

这类断言锁定的是实现形状，不是稳定用户行为，会让正常重构、文案调整、CSS 调整产生低价值失败。

建议：

- 保留少量结构级 smoke 断言即可。
- 对 panel model / renderer 优先写输入 snapshot -> 输出 view model / DOM 可观察行为测试。
- 本地化测试只检查 key 完整性，避免锁定完整翻译文本。

## 已确认的正向结果

### ACP run store 不再保存大 payload

`setAcpSkillRunRecord` 会清理以下大字段：

- `requestPayload`
- `runnerJson`
- `resultJson`
- `lastTurnOutput`
- `transcriptItems`
- `outputRevisions`

证据：

- `src/modules/acpSkillRunStore.ts:1466`
- `src/modules/acpSkillRunStore.ts:1491`

持久化时也会删除 transcript/output revisions，并在 runtimeDir 可用时删除 run context 大字段：

- `src/modules/acpSkillRunStore.ts:2409`
- `src/modules/acpSkillRunStore.ts:2412`

### transcript SSOT 方向正确

ACP Skills transcript 使用 runtime 文件：

- `transcript.jsonl`
- `transcript.index.json`

UI mirror 只在 selected run 或生命周期打开时保留：

- `src/modules/acpSkillRunStore.ts:959`
- `src/modules/acpSkillRunStore.ts:990`
- `src/modules/acpSkillRunStore.ts:1008`

注意：P1 会让 apply 失败后的终态 run 因 controller / recovery state 未收敛而继续被视为 lifecycle open。

### Assistant Workspace 已收敛为单 shell 实例

每个主窗口使用一个 host：

- `src/modules/assistantWorkspaceSidebar.ts:163`

shell frame 已存在时直接复用：

- `src/modules/assistantWorkspaceSidebar.ts:1477`

切换 library / reader 时移动同一个 frame：

- `src/modules/assistantWorkspaceSidebar.ts:1510`

卸载时移除 shell frame、按钮、容器和订阅：

- `src/modules/assistantWorkspaceSidebar.ts:1733`
- `src/modules/assistantWorkspaceSidebar.ts:1754`

### ACP Chat transcript mirror 后台释放策略合理

ACP Chat 后台 idle session 会释放 mirror；前台或 live session 保留：

- `src/modules/acpSessionManager.ts:639`

前台 snapshot 会按需 hydrate transcript：

- `src/modules/acpSessionManager.ts:2967`
- `src/modules/acpSessionManager.ts:3061`
- `src/modules/acpSessionManager.ts:3090`

未发现 ACP Chat 面板与本轮内存治理目标直接冲突的状态模型缺陷。

## 外部报告核实补充

另一个 agent 的报告中，部分结论与本报告已有发现重合，部分结论经复核后确认为新问题，也有少数结论需要修正或不采纳。

### 与已有发现重合的项目

- 毒测试：本报告已指出 `test/core/97-acp-ui-smoke.test.ts` 存在大量源码字符串断言；外部报告补充的 `95`、`96`、`107` 中的同类断言也成立。
- `interruptTurn` 前置条件缺失：本报告已记录 `interruptAcpSkillRunCurrentTurn` 只检查 terminal/controller，不检查 `activePrompt` 或 `replyState`。
- ACP Skills 读模型偏重：本报告已记录 ACP Skills snapshot 会全量扫 run history；外部报告进一步指出 selected run transcript 进入 panel payload 时也是全量深拷贝。
- Implementation Mapping 文档漂移：外部报告指出的行号与路径漂移成立，见本节“文档漂移”。

### 修正或不采纳的项目

#### “controller 可靠释放”不采纳

外部报告认为 ACP Skills controller 释放路径清晰、可靠释放。这个结论与源码不符。

本报告 P1 已确认：`applyResult` 失败时只调用 `markAcpSkillRunApplyResult({ state: "failed" })`，而 `markAcpSkillRunApplyResult` 只有 `state === "succeeded"` 分支会 disconnect / unregister controller：

- `src/modules/workflowExecution/applySeam.ts:834`
- `src/modules/acpSkillRunStore.ts:4731`
- `src/modules/acpSkillRunStore.ts:4786`

因此 apply 失败后 controller 大闭包仍可能长期存活。外部报告的 PASS 结论漏掉了这个失败分支。

#### “状态转移白名单完全未强制”需修正

外部报告称 `upsertAcpSkillRun` 接受任意 status、没有转移白名单。源码中已经有 `resolveAcpSkillRunStatusTransition`：

- `src/modules/acpSkillRunStore.ts:2668`
- `src/modules/acpSkillRunStore.ts:2719`
- `src/modules/acpSkillRunStore.ts:2859`

所以“完全未强制”不成立。

但这里仍有一个较弱的问题：如果调用方传入 `status` 但没有 `statusReason`，`resolveAcpSkillRunStatusTransition` 会直接允许转移：

- `src/modules/acpSkillRunStore.ts:2734`

因此状态机白名单是“有 reason 时强制”，不是所有 status transition 都强制。若文档声称所有状态转移均受白名单约束，应补强实现或调整文档措辞。

#### 硬超时 timer 正常完成清理风险暂不采纳

外部报告要求复核 hard timeout timer 是否在正常完成时清理。源码里多个终态/分支会调用 `hardTimeoutMonitor?.clear()`，包括输出验证成功后：

- `src/modules/acpSkillRunnerOrchestrator.ts:3739`
- `src/modules/acpSkillRunnerOrchestrator.ts:5268`

未看到足够证据将其列为确认问题。

### 新确认问题

#### P1: selected ACP Skills run 的完整 transcript 会进入 host→child payload

`buildAcpSkillRunPanelSnapshot` 对 selected run 使用：

- `src/modules/acpSkillRunStore.ts:5169`
- `src/modules/acpSkillRunStore.ts:5170`

```ts
projectAcpSkillRunRecordForPanel(selected, {
  includeTranscriptItems: true,
})
```

该路径进入 `readTranscriptMirrorItems`，它会遍历 `state.itemIds`，从 mirror 取出所有 item，并 clone 每一条：

- `src/modules/acpSkillRunStore.ts:832`
- `src/modules/acpSkillRunStore.ts:838`
- `src/modules/acpSkillRunStore.ts:841`

结果是：只要 ACP Skills tab 渲染 selected run，整段 transcript 会被放进 panel snapshot，再通过 assistant workspace child snapshot 发送到子 frame。长会话下，这会形成 host 侧深拷贝、IPC 序列化、child 侧再渲染的叠加成本。

这与 `transcript.jsonl` 作为 SSOT 的方向不冲突，但当前 panel 读模型仍是 selected-run 全量读，不是分页读。

建议：

- ACP Skills panel 改为传 transcript page，而不是把 selected run 全量 transcript 放进 panel snapshot。
- 复用已有 `readTranscriptMirrorPage` / `readAcpSkillRunTranscriptPage` 语义：
  - `src/modules/acpSkillRunStore.ts:796`
  - `src/modules/acpSkillRunTranscriptStore.ts:650`

#### P1: transcript DOM 渲染无虚拟化，child window 会持有整段 transcript DOM

`renderAssistantTranscript` 会先把完整 `opts.items` 规整为 `items`：

- `addon/content/shared/assistant/assistant-transcript-renderer.js:958`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:964`

当 order/mode 变化时，它会清空 container，然后对所有 `items.forEach` 创建 row 并 append：

- `addon/content/shared/assistant/assistant-transcript-renderer.js:1001`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:1004`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:1006`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:1010`

增量路径也只是对所有 items 遍历，缺失 row 时 append，并把 row 保存在 `nodeMap`：

- `addon/content/shared/assistant/assistant-transcript-renderer.js:1013`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:1018`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:1019`

没有 max rows、窗口化、回收或虚拟列表。因此长会话 selected transcript 会在子窗口中形成完整 DOM 和完整 `nodeMap`。

建议：

- 为 transcript renderer 加渲染窗口，例如仅保留最近 N 条，历史通过分页/滚动按需加载。
- `nodeMap` 应随窗口回收不再可见的 row。

#### P2: tool activity 展开/收起在 ACP Chat 与 ACP Skills 中可能被 transcript revision 早返吞掉

ACP Chat：

- `addon/content/sidebar/acp-chat.js:543`
- `addon/content/sidebar/acp-chat.js:593`
- `addon/content/sidebar/acp-chat.js:599`

ACP Skills：

- `addon/content/sidebar/acp-skill-run.js:565`
- `addon/content/sidebar/acp-skill-run.js:591`
- `addon/content/sidebar/acp-skill-run.js:597`

两边的 `onToggleExpanded` 都会更新 `toolActivityExpandedIds` 后调用 `renderTranscript`。但 `renderTranscript` 早返只比较 `transcriptRevision` 与 display mode，不比较 expanded ids。仅展开状态变化时 revision/mode 不变，因此不会进入 renderer。

renderer 内部的 item signature 已经包含 expanded 状态：

- `addon/content/shared/assistant/assistant-transcript-renderer.js:905`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:929`

但当前早返导致这段 diff 逻辑不会被触发。

建议：

- 将 expanded ids signature 纳入 `renderTranscript` 的早返条件。
- 或在 toggle 时强制触发 transcript render。

#### P2: drawer 截断提示在无 running section 时会丢失

drawer notice 只在 `sectionId === "running"` 的 section 渲染后追加：

- `addon/content/shared/assistant/assistant-panel-renderer.js:1903`

但空 section 会先被跳过：

- `addon/content/shared/assistant/assistant-panel-renderer.js:1848`

因此当列表中只有 completed runs、没有 running section 时，`drawer.notice` 即使存在也不会显示。这会影响 `buildAcpSkillRunPanelSnapshot` 中的 recent-runs 截断提示：

- `src/modules/acpSkillRunStore.ts:5160`

建议：

- notice 不应绑定到 running section，应该在 section loop 后根据 `noticeText` 统一渲染。

#### P2: ACP Chat `pendingAction` 是本地乐观状态，可能与 SSOT 漂移

ACP Chat 在前端本地设置 `state.pendingAction`：

- `addon/content/sidebar/acp-chat.js:299`
- `addon/content/sidebar/acp-chat.js:321`
- `addon/content/sidebar/acp-chat.js:336`

panel model 再用 `pendingAction` 覆盖 effective status：

- `addon/content/shared/assistant/assistant-panel-model.js:2468`
- `addon/content/shared/assistant/assistant-panel-model.js:2470`
- `addon/content/shared/assistant/assistant-panel-model.js:2472`

该 flag 只在收到 `acp:init` / `acp:snapshot` 时清除：

- `addon/content/sidebar/acp-chat.js:674`

如果 connect/disconnect 请求失败且没有后续 snapshot，UI 可能停在本地 optimistic 的 connecting/disconnecting 状态。更稳妥的方向是从后端 SSOT 状态派生，或给本地 pending flag 加超时/失败清理。

#### P3: transcript revision 早返只做等值判断，乱序 snapshot 可覆盖较新内容

ACP Chat 与 ACP Skills 都只用 `state.transcriptRevision === revision` 作为跳过条件：

- `addon/content/sidebar/acp-chat.js:543`
- `addon/content/sidebar/acp-skill-run.js:566`

测试还显式断言不包含旧的单调守卫：

- `test/core/97-acp-ui-smoke.test.ts:2269`

如果 host→child snapshot 存在乱序送达，较低 revision 仍可能触发渲染并覆盖较新内容。若系统保证 snapshot 顺序，应把这个顺序不变量写入文档和测试；否则应恢复单调守卫。

#### P3: ACP Skills host 侧 snapshot 缺少 skip/signature guard，订阅也没有 run-scoped 过滤

`subscribeAcpSkillRunSnapshots` 只注册无参 listener：

- `src/modules/acpSkillRunStore.ts:5201`

`emitChanged` 会通知所有 listener，但不携带变更 descriptor：

- `src/modules/acpSkillRunStore.ts:2645`
- `src/modules/acpSkillRunStore.ts:2650`

assistant workspace 收到任意 ACP Skill run 变化都会：

- `maybeShowAcpSkillWaitingToasts`
- `schedulePostSnapshot`
- `updateAssistantAttentionIndicator`

证据：

- `src/modules/assistantWorkspaceSidebar.ts:1710`
- `src/modules/assistantWorkspaceSidebar.ts:1712`

而 `postAcpSkillRunSnapshot` 会重新 `prepareAcpSkillRunPanelSnapshot`：

- `src/modules/assistantWorkspaceSidebar.ts:684`
- `src/modules/assistantWorkspaceSidebar.ts:688`

这会放大 selected transcript 全量 payload 的问题。后台 run streaming 时，即便 active tab 不是 ACP Skills，也可能触发 host 侧重建。

建议：

- listener 下发 requestId / change kind。
- workspace 侧按 `activeTab`、`selectedRequestId` 和 revision signature 短路。

#### P3: shutdown 与测试 reset 不对称，ACP Skill run store 部分内存态不会在 shutdown 中清空

`shutdownAcpSkillRunConversations` 只遍历 `controllers` 并尝试 disconnect，然后 unregister controller：

- `src/modules/acpSkillRunStore.ts:5208`
- `src/modules/acpSkillRunStore.ts:5225`

它不会清空：

- `runRecords`
- `transcriptLiveStates`
- `runtimeOptionsByRequestId`
- `activeRunRequestIds`
- `transcriptWriteBatches`

而测试 reset / memory clearer 会清理这些结构：

- `src/modules/acpSkillRunStore.ts:5262`
- `src/modules/acpSkillRunStore.ts:5267`
- `src/modules/acpSkillRunStore.ts:5269`
- `src/modules/acpSkillRunStore.ts:5278`

如果真实卸载会导致模块重新求值，这个问题影响有限；但软 reload / 长生命周期 shutdown-restart 场景下会产生不对称风险。

同时，transcript write batch 使用 50ms timer：

- `src/modules/acpSkillRunStore.ts:1269`
- `src/modules/acpSkillRunStore.ts:1290`

全局 shutdown 路径没有显式 flush `transcriptWriteBatches`：

- `src/modules/acpSkillRunStore.ts:1337`
- `src/modules/acpSkillRunStore.ts:5208`

建议：

- shutdown 末尾显式 drain transcript batches。
- 视真实生命周期选择是否提供生产用的 `clearAcpSkillRunRuntimeMemory`，避免直接复用测试 reset 清 store。

#### P3: 残留死代码 / 死 seam

确认以下报告项成立：

- `migrateLegacyConversationIfNeeded` 是 no-op stub，却仍在 `readStoredAcpChatSessionIndex` 中调用：
  - `src/modules/acpConversationStore.ts:571`
  - `src/modules/acpConversationStore.ts:574`
  - `src/modules/acpConversationStore.ts:601`
- `migrateLegacyStateDatabaseIfNeeded` 是空函数，却仍在 `ensureStateDirectory` 中调用：
  - `src/modules/pluginStateStore.ts:307`
  - `src/modules/pluginStateStore.ts:313`
  - `src/modules/pluginStateStore.ts:321`
- `resolveAcpStoragePaths` 是 `resolveAcpChatRuntimePaths` 的别名导出，未发现生产调用方：
  - `src/modules/acpConversationStore.ts:430`
- `resolveAcpSessionCwd` 仅测试使用，生产未调用：
  - `src/modules/acpConversationStore.ts:432`
  - `test/core/96-acp-session-manager.test.ts:45`

建议删除 no-op stub 与调用；测试专用 seam 若仍需要，应改名标明用途或迁入测试辅助层。

#### P3: 毒测试范围比初版报告更广

除本报告已列出的 `test/core/97-acp-ui-smoke.test.ts` 外，以下测试也确认存在源码字符串/内部实现断言：

- `test/core/95-skillrunner-sidebar-host-runtime.test.ts`：大量 `readProjectFile` + `indexOf` / 私有 helper 名 / 精确缩进片段断言。
- `test/core/96-acp-session-manager.test.ts:722`：直接断言 `AcpChatSessionRuntime`、`sessionRuntimes`、`getOrCreateSessionRuntime` 等内部符号。
- `test/core/107-acp-skillrunner-compatible-runner.test.ts:3090`：断言 adapter 源码 token，如 `explicit_descriptor_injection`、`mcp_compat_disabled`、`return [descriptor];`。
- `test/core/171-acp-runtime-memory-governance.test.ts:555`：断言 transcript index 内部 `eventOffsets` / `eventLengths` 数组长度，锁定内部存储结构。

建议优先保留真正的行为测试，把源码 token、私有 helper 名、完整文案、格式化片段断言收敛掉。

#### P4: `doc/acp-skills-state-machine-ssot.md` Implementation Mapping 漂移

文档的 Implementation Mapping 行号已经明显过期：

- `doc/acp-skills-state-machine-ssot.md:393`
- `doc/acp-skills-state-machine-ssot.md:404`

例如文档写 `isTerminalAcpSkillRunStatus` 在 `src/modules/acpSkillRunStore.ts:1153-1157`，实际在：

- `src/modules/acpSkillRunStore.ts:1400`

文档还引用不存在的路径：

- `doc/acp-skills-state-machine-ssot.md:409`

```md
addon/content/dashboard/assistant-panel-model.js
```

实际文件是：

- `addon/content/shared/assistant/assistant-panel-model.js`

`AcpConnectionAdapter` 映射也误指到结果/快照类型区间：

- `doc/acp-skills-state-machine-ssot.md:410`
- `src/modules/acpConnectionAdapter.ts:102`

真正的 adapter interface 在：

- `src/modules/acpConnectionAdapter.ts:141`

建议去掉易漂移行号，改为符号名或较粗粒度路径；若保留行号，应在本轮修复中同步刷新。

## 建议修复顺序

1. 先修 P1：apply failed 后释放 controller，并让终态状态收敛。
2. 同步补 P1 回归测试：`markAcpSkillRunApplyResult({ state: "failed" })` 后 controller 不存在。
3. 修 selected-run transcript 全量 payload 与 transcript DOM 无虚拟化问题。
4. 修 P2 disconnect 异常路径，确保 `connectionActionState` 不会卡住。
5. 修 ACP Skills render key，确保 runtime option 变更可见。
6. 修 tool activity 展开早返、drawer 截断提示丢失、ACP Chat pendingAction 漂移。
7. 收敛 `95` / `96` / `97` / `107` / `171` 中的源码字符串与内部结构断言。
8. 评估 ACP run history recent index、host snapshot signature guard、run-scoped subscription descriptor。
9. 清理 no-op stub / 死 seam，并刷新 `acp-skills-state-machine-ssot.md` Implementation Mapping。
