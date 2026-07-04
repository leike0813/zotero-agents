# ACP Chat 与 SkillRunner Transcript 虚拟化迁移审阅报告

日期：2026-07-04

审阅对象：`backup/failed-assistant-workspace-migration-20260704`

目标：

- ACP Chat transcript 迁移到“后端分页 + 前端虚拟化”的渲染模式。
- SkillRunner 面板支持前端虚拟化渲染，但不引入后端分页。
- 复用当前 ACP Skills 已经稳定下来的 transcript 分页与虚拟化设计。
- 避免备份分支曾经出现的 ACP Chat 自循环、高频重读、snapshot 获取失败，以及读模型隔离破坏多个面板的问题。

## 进度更新（2026-07-04）

已完成并落地：

- [x] 新开并完成 OpenSpec change `virtualize-skillrunner-transcripts`；当前工作区显示该 change 已进入 `openspec/changes/archive/2026-07-04-virtualize-skillrunner-transcripts/`，并已将 SkillRunner transcript virtualization 要求同步到主 spec。
- [x] shared renderer 已支持 items-only virtual source：`assistant-transcript-renderer.js` 增加 `virtualSourceMode` / `setVirtualTranscriptItemsSource()`，并保证 items mode 不触发 `onRequestPage`。
- [x] SkillRunner 面板已接入 shared renderer 的 items-only 虚拟化：`run-dialog.js` 使用 `transcriptContextKey` 作为 `pageKey`，传入 `virtualized` 与 `transcriptRevision`，上下文切换时 reset virtual state，未引入 `load-transcript-page`。
- [x] SkillRunner workspace snapshot 已暴露 `transcriptPaginationVirtualizationEnabled`，值来自现有 transcript rendering preference。
- [x] 所有 locale 的偏好帮助文案已更新为“ACP Skills 分页虚拟化 + SkillRunner 虚拟化”，未声称 ACP Chat 已迁移。
- [x] 已补行为测试：items-only virtualized renderer 不请求 page；SkillRunner 接线守卫确认 virtualized/pageKey/transcriptRevision 且无 `load-transcript-page`。
- [x] 新开并完成 OpenSpec change `acp-chat-structural-transcript-snapshot`；当前工作区显示该 change 已进入 `openspec/changes/archive/2026-07-04-acp-chat-structural-transcript-snapshot/`，并已将 ACP Chat structural snapshot 要求同步到主 spec。
- [x] ACP Chat UI snapshot 读取已支持显式 `itemMode: "structural"`：默认 full 行为保持不变，structural mode 只返回 plan items，并保留 transcript revision/count/preview/state 等 metadata。
- [x] `publishMode: "structural"` 已修正为即使 transcript mirror loaded，也不会把 message/thought/tool_call 全量 transcript items 写入 published UI snapshot。

已验证：

- [x] `test/core/97-acp-ui-smoke.test.ts` 单文件 smoke：49 passing。
- [x] `openspec validate virtualize-skillrunner-transcripts --strict` 在归档前通过；归档后主 spec 已包含新增 SkillRunner requirement。
- [x] 本次 touched 文件的 Prettier check、`git diff --check`、`npx tsc --noEmit` 通过。
- [x] `npm run lint:check` 已运行；失败原因是 15 个非本次改动文件的既有 Prettier 警告，本次改动文件不在剩余警告列表中。
- [x] `test/core/96-acp-session-manager.test.ts` 单文件完整测试：72 passing。
- [x] `openspec validate acp-chat-structural-transcript-snapshot --strict` 在归档前通过；归档后主 spec 已包含新增 ACP Chat structural snapshot requirement。

尚未完成：

- [ ] ACP Chat 的 page reader、workspace sidebar page 编排、child page rendering guard、以及 Skills 风格 publication-path 过滤。

## 结论

最简单、最合理可行的迁移方案不是复活备份分支，而是从当前 `dev` 上 ACP Skills 的成功路径出发，只抽取其中三个稳定概念：

1. host 只向 child 下发当前选择对象的 transcript page。
2. child 用 request-scoped `pageKey` 隔离虚拟化缓存。
3. page 请求只服务当前 active/selected scope，迟到页和错 scope 页必须被丢弃。

ACP Chat 应采用同样的模式，但实现边界要窄：只让 ACP Chat panel snapshot 携带结构项和当前 transcript page，不要重写全局 session manager 的 listener、session index cache 或读模型体系。

SkillRunner 不适合后端分页。它的 snapshot 模型本来就是 panel/session 级完整投影，迁移重点应放在共享 renderer 支持 `items` 作为虚拟化 source，而不是为 SkillRunner 增加 page action。

## 与另一份审核结论的对齐

另一份审核和本文档的总体判断一致：

- 都认为 ACP Chat 应复制 ACP Skills 已经稳定的主机连接模式，而不是复活备份分支的整套读模型隔离。
- 都认为 shared renderer 的 `virtualSourceMode: "items"` 和 SkillRunner 接线是备份分支中最值得复用的部分。
- 都认为 ACP Chat child 侧的 page scope guard、`onRequestPage` 和轻量 page signature 是正确方向。
- 都认为应废弃 `notifyFrontend` 分割、listener `itemMode` map、session index cache、共享 subscription 限制和主机端全量 `JSON.stringify` 签名。

另一份审核补充了三个应吸收到方案中的关键点：

1. ACP Skills 的成功不只是“有分页和虚拟化”，还包括发布路径治理：`buildSeq` 生成守卫、低开销签名、per-tab child snapshot，以及 `shouldRefreshAcpSkillRunSnapshotForChange` / `isPureAcpSkillRunBackgroundChange` 对纯后台实时变更的过滤。
2. ACP Chat 当前的主要差距在 publication path：`clonePublishedSessionRuntimeSnapshot` 会深度克隆所有 items，`buildAcpSidebarViewSnapshot` 会映射所有 items，`acp-chat.js` 又 eager 渲染这些 items；因此仅在 child 端打开虚拟化不能解决 host payload 和 snapshot 构造成本。
3. 备份分支破坏三个面板的一个具体原因是把共享 `subscribeAcpFrontendSnapshots` 刷新路径限制到 `acp-chat`，并在偏好/任务订阅路径遗漏 `skillrunner` 分支。迁移时必须保留共享订阅对三类面板的驱动能力，只在具体 tab 的 snapshot 构造和刷新过滤处做分流。

本文档对另一份审核的一个保留意见是：其提到的 `readAcpConversationTranscriptPage` “两个 bug 修复”需要在实现前从备份 diff 和测试中逐项核实。已确认备份分支在 `acpSessionManager.ts` 包装层做了有价值的处理：显式解析 backend/conversation scope、按 session flush pending transcript writes、再从 durable transcript store 读 page。这应纳入新的 page reader，但不应直接扩大为全局读模型重写。

## 当前主线中可作为基准的设计

ACP Skills 当前实现已经形成清晰边界：

- `assistantWorkspaceSidebar.ts`
  - 处理 child 的 `load-transcript-page` action。
  - 校验 `requestId` 必须等于当前 selected ACP Skill run。
  - 调用 `postAcpSkillRunSnapshot(..., { transcriptPage })` 强制投递指定 page。
  - 使用 build sequence guard 丢弃过期异步 snapshot build。
  - 对 ACP Skills snapshot 使用低开销签名去重，避免无变化时反复投递。

- `acpSkillRunStore.ts`
  - `prepareAcpSkillRunPanelSnapshot()` 构造 panel snapshot。
  - `selectedTranscriptPageForRun()` 从当前 selected run 的 mirror 读取 page。
  - snapshot 只带 `selectedTranscriptPage`，不恢复旧的 `selectedRun.transcriptItems` 全量渲染模型。
  - 选择状态由 store 的 SSOT 管理，page request 不能隐式改变 selected request。

- `acp-skill-run.js`
  - `selectedTranscriptPageForRun(run)` 校验 page requestId 与当前 run requestId 一致。
  - `pageKey` 使用 requestId。
  - pending selection、loading snapshot、stale revision、page signature 都在 child 侧保护。

- `assistant-transcript-renderer.js`
  - 管理 page cache、virtual window、scroll anchor、row height measurement。
  - 使用 `pageKey` 隔离不同 run 的虚拟化状态。
  - page mismatch 时拒绝渲染并 reset。

此外，ACP Skills 的 workspace 发布路径有一个重要经验：不是所有 store change 都应触发当前 panel snapshot 重建。`shouldRefreshAcpSkillRunSnapshotForChange` / `isPureAcpSkillRunBackgroundChange` 会过滤纯后台变更，避免后台 token 或非 selected run 更新拖慢当前 UI。

这条路径是本轮迁移应复用的主模型。

## 备份分支做对的部分

### 1. 共享 renderer 的 items-only 虚拟化方向正确

备份分支在 `assistant-transcript-renderer.js` 中新增了 `virtualSourceMode`：

- `page` 模式：用于 ACP Skills 和 ACP Chat 的后端分页。
- `items` 模式：用于 SkillRunner 这类不分页、但需要前端虚拟化的场景。

它还做了两个关键保护：

- 当 `virtualSourceMode === "items"` 时，不触发 `onRequestPage`。
- `page` 与 `items` 模式切换时 reset virtual state，避免复用错误缓存。

这部分是可复用度最高的改动。

### 2. ACP Chat child 侧的 scope guard 方向正确

备份分支在 `acp-chat.js` 中引入了几个正确概念：

- `pageKey = backendId + conversationId`。
- `selectedTranscriptPageForConversation()` 校验 page 属于当前 active conversation。
- 切换 backend/conversation 时 reset transcript render state 和 virtual state。
- `selectedTranscriptPageSignature()` 用于避免同 revision 下重复渲染。
- `ready-without-page` 时显示 loading，避免把旧 conversation 的 page 当成当前内容。
- `load-transcript-page` action 携带 backendId、conversationId、cursor、limit。

这些 guard 应保留，但需要配合更窄的 host 设计。

### 3. ACP Chat structural snapshot 的方向正确

ACP Chat 要做到后端分页，host 不能再每次把完整 `items` 克隆进 panel snapshot。备份分支引入 `itemMode: "structural"` 的目标是正确的：主 panel snapshot 只带结构项，例如 plan，用于顶部 plan 面板；完整 transcript 内容走 page。

当前主线中 `structural` 语义还不完整：mirror 已加载时仍容易让完整 transcript 进入 snapshot。应修正为 plan-only structural items。

### 4. SkillRunner 不做后端分页是正确判断

SkillRunner 面板的 transcript 来自 run workspace/session 投影，和 ACP Skills/ACP Chat 的 durable transcript page 模型不同。备份分支只让 SkillRunner child 调 shared renderer 的 virtualized items mode，不新增 `load-transcript-page`，这是正确方向。

### 5. 避免每次 ACP Chat snapshot 都 refresh backends 是正确方向

当前主线存在 `postFreshAcpChatSnapshot()`，每次 ACP Chat snapshot 前会 `refreshAcpConversationBackends()`。这对普通状态刷新可能可以接受，但对 transcript live update 和滚动 page request 来说成本过高。

备份分支把 backend refresh 改成 child-ready、tab-switch、backend-manager 等边界触发，这个方向可以借鉴，但不应连带引入复杂读模型重写。

## 备份分支做错的部分

### 1. 变更范围过大

备份分支一次性改了：

- ACP Chat transcript 分页。
- shared renderer。
- SkillRunner 虚拟化。
- ACP session manager snapshot item mode。
- frontend/conversation listener 选项。
- session index cache。
- workspace sidebar snapshot 调度。
- backend refresh 策略。

这些变化没有形成清晰的提交边界。任何一个问题都会表现为“面板 snapshot 不稳定”，很难定位。

### 2. 双 subscription 是自循环风险源

备份分支让 workspace sidebar 同时订阅：

- `subscribeAcpFrontendSnapshots(...)`
- `subscribeAcpConversationSnapshots(...)`

而 ACP Chat snapshot 构造、hydrate、backend refresh 又可能触发这些 listener。这样形成了两条刷新源，容易出现：

- 同一事件触发多次 snapshot。
- hydrate 完成后再次触发 snapshot。
- backend refresh 通知 frontend 后又构造 snapshot。
- page request 和普通 refresh 互相踩状态。

当前主线只有 frontend subscription 到 `schedulePostSnapshot()` 的单入口，虽然粗糙，但可控。迁移时应保留单入口，最多细化 tab-specific schedule，不应新增 conversation subscription。

### 3. 无条件 token 级刷新缺少 ACP Skills 风格过滤

备份分支新增的 `subscribeAcpConversationSnapshots` 在每个 token / chunk 更新上都可能调度 ACP Chat snapshot。它没有类似 ACP Skills 的实时变更过滤器，也没有区分：

- 当前 active conversation 的 transcript page 是否真的需要更新。
- 更新是否只是后台 conversation 的变化。
- 更新是否只影响 durable transcript，而不需要重建 panel chrome、session drawer 或 backend selector。

这导致 transcript live update 从“追加一条 transcript event”升级成“反复重建并投递完整 panel snapshot”。正确做法是为 ACP Chat 增加 Skills 风格的刷新判定：只有当前 active scope、边界事件、page 相关变化或面板 chrome 相关变化才触发当前 child snapshot；纯后台变更只更新 badge/attention 或持久化状态。

### 4. `notifyFrontend: false` 破坏了现有 snapshot 获取路径

备份分支为了避免 ACP Chat 自循环，在 streaming chunk 上设置 `notifyFrontend: false`，然后依赖新增的 conversation subscription 推动 UI。

这解释了失败记录中的现象：

- 有 conversation subscription 时，可能出现自循环和高频重读。
- 移除自循环后，frontend snapshot 不再被通知，ACP Chat child 就拿不到新 snapshot。

这个方向不应复用。更合理的是：frontend listener 仍然是唯一 UI 更新入口，但 listener 得到的是轻量 structural snapshot，不携带完整 transcript。

### 5. 读模型隔离改到了全局层，影响面过大

备份分支把 `getAcpConversationUiSnapshot()`、`getAcpFrontendSnapshot()`、`subscribeAcpConversationSnapshots()`、`subscribeAcpFrontendSnapshots()` 都加了 `itemMode`，并改成 listener option map。

概念上这是“读模型隔离”，但实现落点太深，影响了所有调用者和测试。更合理的边界是：

- 默认 API 仍保持 full snapshot 行为。
- 只给 workspace sidebar 的 ACP Chat snapshot 构造路径传入 structural 读取选项。
- 不修改 listener 的 public semantics，除非确有跨调用方需求。

### 6. session index cache 与 transcript 分页无直接关系

备份分支新增 `acpChatSessionIndexCache`、`replaceCachedAcpChatSessionIndex()`、`refreshCachedAcpChatSessionIndex()` 等逻辑。这些改动和 transcript 分页不是同一个问题。

它们会影响：

- active conversation 解析。
- archive/delete/new conversation。
- backend session list。
- frontend snapshot 的会话列表。

这些都是 ACP Chat 导航核心路径。把它们和 transcript 渲染迁移放在一起，风险过高，不应复用。

### 7. page 读取只依赖 active mirror 不够稳

备份分支新增 `readAcpConversationTranscriptMirrorPage()`，只从已加载 mirror 读取 page。这个函数本身可借鉴，但不能作为唯一 page source。

问题场景：

- conversation 刚切换，mirror 未 hydrate。
- background mirror 被释放。
- hydrate 正在等待 pending writes。
- durable transcript 已存在，但 mirror 尚未 ready。

ACP Chat 的 page request 应优先使用当前内存 mirror，必要时可回落到 `acpConversationTranscriptStore.readAcpChatTranscriptPage()`，并在返回 DTO 中带上 backendId/conversationId/pageKey/revision。

### 8. 主机端全量 snapshot signature 成本过高且去重不可靠

备份分支新增 `lastAcpChatSnapshotSignature`，但签名只删除了 `generatedAt`。ACP frontend snapshot 里还有 `updatedAt: nowIso()` 等字段，导致签名很可能每次不同。

如果需要 snapshot 去重，应基于稳定字段构造签名，至少排除：

- `generatedAt`
- frontend `updatedAt`
- volatile runtime timestamp

另一个问题是成本：对整个 page / panel snapshot 做 `JSON.stringify` 本身就会遍历大对象。如果 snapshot 仍携带完整 transcript，签名计算可能比直接投递还贵。正确做法是先让 host snapshot 变小，再用字段级 cheap signature，例如 active backend/conversation、status、transcriptRevision、page cursor/total/item ids、panel chrome revision 等稳定字段。

### 9. 共享 frontend subscription 被限制会破坏其他面板

备份分支曾把共享 `subscribeAcpFrontendSnapshots` 驱动路径限制为只刷新 `acp-chat`。这会让 ACP Skills、SkillRunner、session drawer、偏好变化和 task subscription 相关的刷新路径失去统一入口。

迁移时需要区分两件事：

- subscription 仍然是 assistant workspace 的共享入口，不能只服务 ACP Chat。
- snapshot 构造和刷新过滤可以按 active tab 分流，避免非 active tab 做重活。

尤其要保留 SkillRunner 分支：偏好变更、任务变更、workspace focus 等路径仍要能调度 SkillRunner sidebar refresh，而不是落入 ACP Chat 的 snapshot path。

### 10. 部分测试锁死源码字符串，维护价值有限

备份分支新增了不少 `assert.include(source, "...")` 类型测试。这类测试适合防止粗暴回退，但不适合作为主要回归保障。

更有价值的是行为测试：

- ready-without-page 不复用旧页。
- late page scope mismatch 不渲染。
- items-only virtualized transcript 不请求 page。
- structural snapshot 不携带 message/tool 全量 transcript。

## 可复用或可借鉴改动清单

建议复用：

- `assistant-transcript-renderer.js`（已采用）
  - `virtualSourceMode`
  - `setVirtualTranscriptItemsSource`
  - items mode 不触发 `requestVirtualTranscriptPage`
  - mode switch reset virtual state

- `acp-chat.js`
  - `transcriptPageKey(backendId, conversationId)`
  - `selectedTranscriptPageForConversation`
  - `selectedTranscriptPageSignature`
  - `resetTranscriptVirtualState`
  - ready-without-page loading guard
  - `onRequestPage` payload scope 校验

- `run-dialog.js`（已采用）
  - `transcriptPaginationVirtualizationEnabled`
  - `pageKey: requestId + selectedTaskKey`
  - items-only `virtualized` 调用

- `skillRunnerRunDialog.ts`（已采用）
  - workspace snapshot 增加 `transcriptPaginationVirtualizationEnabled`

建议只借鉴思想、不直接复用：

- `itemMode: "structural"`：保留概念，但实现为窄接口。
- `readAcpConversationTranscriptMirrorPage()`：保留 mirror page 读取思想，但增加 durable store fallback 或统一 page reader。
- `readAcpConversationTranscriptPage` 包装层中的 scope 解析和 per-session pending write flush：保留思想，纳入新的 page reader。
- `getActiveAcpConversationScope()`：保留为 host 校验 page request 的轻量辅助函数。
- backend refresh 去重：保留边界触发思路，但不要重写整个 snapshot 调度体系。

建议不复用：

- `acpChatSessionIndexCache` 及相关 session index cache 体系。
- `subscribeAcpConversationSnapshots(..., { itemMode })` 作为 workspace sidebar 第二刷新源。
- `notifyFrontend: false` + conversation subscription 的 UI 推送模型。
- 大范围 listener option map 改造。
- 共享 `subscribeAcpFrontendSnapshots` 的 tab 限制。
- 主机端全量 `JSON.stringify(snapshot)` 签名。
- `latestAcpConversationSnapshot`/read model 隔离相关旧尝试。

## 推荐实现方案

### 阶段 1：扩展共享 renderer 支持 items-only virtual source（已完成）

修改：

- `addon/content/shared/assistant/assistant-transcript-renderer.js`

目标：

- 保持现有 page virtualization 行为不变。
- 新增 items-only virtualization。
- SkillRunner 可直接传完整 `items`，由 renderer 内部切 virtual window。

关键设计：

- virtual state 增加 `virtualSourceMode`。
- `mergeVirtualTranscriptPage()` 进入 page mode。
- `setVirtualTranscriptItemsSource()` 进入 items mode。
- `requestVirtualTranscriptPage()` 在 items mode 下直接 return。
- page mode 与 items mode 切换时 reset cache、row heights、anchor。

风险控制：

- ACP Skills 的 `page` 模式不能受影响。
- `pageKey` 变化必须 reset。
- items mode 不允许触发 `onRequestPage`。

### 阶段 2：SkillRunner 面板接入 items-only 虚拟化（已完成）

修改：

- `addon/content/sidebar/run-dialog.js`
- `src/modules/skillRunnerRunDialog.ts`

目标：

- SkillRunner snapshot 继续携带完整 conversation items。
- child 渲染时开启 shared renderer 的 items-only virtualized 模式。
- 不引入后端分页和 `load-transcript-page`。

关键设计：

- `RunWorkspaceSnapshot` 增加 `transcriptPaginationVirtualizationEnabled?: boolean`。
- snapshot 中填入 `isAssistantTranscriptPaginationVirtualizationEnabled()`。
- `run-dialog.js` 用 `state.transcriptContextKey = requestId + "\n" + selectedTaskKey` 作为 pageKey。
- `renderAssistantTranscript({ virtualized, pageKey, transcriptRevision })`。

验收标准：

- 大量 SkillRunner transcript 不再一次性渲染所有 DOM rows。
- 切换 task/run 后旧 virtual cache 不会复活。
- 不出现 `sendAction("load-transcript-page")`。

### 阶段 3：ACP Chat 增加窄版 structural snapshot 读取（已完成）

修改：

- `src/modules/acpSessionManager.ts`

目标：

- 默认 `getAcpConversationUiSnapshot()` 行为仍保持 full。
- workspace sidebar 可请求 structural snapshot，避免主 snapshot 携带完整 transcript。
- structural items 只保留 plan 等面板结构所需项。
- live token 不再导致 host 反复 clone/map 完整 transcript。

关键设计：

- 增加内部类型：
  - `AcpConversationSnapshotItemMode = "full" | "metadata" | "structural"`
  - `AcpConversationSnapshotReadOptions = { itemMode?: ... }`
- `getAcpConversationUiSnapshot(backendId?, conversationId?, options?)` 支持 options。
- `getAcpFrontendSnapshot(options?)` 支持 options。
- 默认仍为 `"full"`，不改变现有调用。
- `structural` 模式下 `items` 只包含 plan items。
- live transcript chunk 在偏好开启时发布 structural，而不是 full。
- `clonePublishedSessionRuntimeSnapshot` 在 structural 模式下不能从 full `uiSnapshot.items` 派生大数组；应直接从 runtime mirror 中读取结构项，或者从 snapshot metadata 生成结构视图。
- `buildAcpSidebarViewSnapshot` 在 structural 输入下只映射 structural items，避免重新制造全量 clone 成本。

不建议做：

- 不修改 subscription API。
- 不增加 session index cache。
- 不引入第二条 conversation subscription。
- 不把 `notifyFrontend` 关闭作为避免自循环的手段。

### 阶段 3.5：为 ACP Chat 增加 Skills 风格刷新过滤

修改：

- `src/modules/acpSessionManager.ts`
- `src/modules/assistantWorkspaceSidebar.ts`

目标：

- 保持 frontend notification 开启。
- 让 notification 触发的是轻量、可过滤的 active-tab refresh，而不是每个 token 都重建完整 snapshot。
- 防止后台 conversation 或纯 transcript append 拖慢当前 UI。

关键设计：

- 增加 ACP Chat snapshot change 的轻量描述，至少包含 backendId、conversationId、status/transcriptRevision、是否 active scope、是否 transcript-only。
- workspace sidebar 保留共享 `subscribeAcpFrontendSnapshots` 入口，但调度前判断 active tab。
- 对 ACP Chat active tab：
  - selected/active conversation 的边界事件、状态变化、权限请求、session drawer 数据变化触发 snapshot。
  - live transcript chunk 只触发 structural snapshot/page tail 更新，不触发 full snapshot。
  - 非 active conversation 的纯后台 transcript 变化不触发当前 child snapshot。
- 对 ACP Skills 和 SkillRunner：
  - 不得因为 ACP Chat 的过滤而丢失原有刷新入口。
  - 偏好变更、task subscription、SkillRunner workspace refresh 仍走各自分支。

风险控制：

- 过滤器只能减少重活，不能吞掉 active scope 的权限请求、错误、连接状态和 conversation 切换。
- 如果无法在第一步做精细 change object，至少先用 active tab + stable cheap signature 控制投递，避免恢复备份分支的双 subscription。

### 阶段 4：ACP Chat 增加 page reader

修改：

- `src/modules/acpSessionManager.ts`
- 可能需要扩展 `src/modules/acpConversationTranscriptStore.ts` 的类型导出。

目标：

- 提供 host 读取 ACP Chat transcript page 的单一窄接口。
- page DTO 带完整 scope 信息，供 child 和 renderer 校验。

建议接口：

```ts
export async function readAcpConversationTranscriptPageForUi(args: {
  backendId?: string;
  conversationId?: string;
  cursor?: number;
  limit?: number;
}): Promise<{
  backendId: string;
  conversationId: string;
  requestId: string;
  items: AcpConversationItem[];
  cursor: number;
  prevCursor?: number;
  nextCursor?: number;
  total: number;
  eventSeq: number;
  transcriptRevision: number;
  limit: number;
}>;
```

关键设计：

- `requestId` 可设为 `${backendId}\n${conversationId}`，与 child `pageKey` 一致。
- 校验 backendId/conversationId 非空。
- flush 当前 conversation pending transcript writes。
- 优先使用当前 loaded mirror 可选，但必须可回落到 durable `readAcpChatTranscriptPage()`。
- 返回的 `transcriptRevision` 使用 page eventSeq 或 snapshot transcriptRevision 中较大值。
- 备份分支中 `readAcpConversationTranscriptPage` 包装层的两个关键点应保留：显式解析 conversation scope，并按该 session flush pending writes 后再读 durable store。

### 阶段 5：workspace sidebar 作为 ACP Chat page 编排点

修改：

- `src/modules/assistantWorkspaceSidebar.ts`

目标：

- ACP Chat snapshot 构造为 structural snapshot + selected page。
- page request 只服务当前 active ACP Chat scope。
- 不再每次 ACP Chat snapshot 都 refresh backends。
- 共享 frontend subscription 继续驱动 ACP Chat、ACP Skills、SkillRunner 三个面板，但重活按 active tab 分流。

关键设计：

- `buildAcpSnapshot(target, options?)`：
  - 偏好关闭时使用 full snapshot，维持旧行为。
  - 偏好开启时：
    - `getAcpConversationUiSnapshot(undefined, undefined, { itemMode: "structural" })`
    - `getAcpFrontendSnapshot({ itemMode: "structural" })`
    - 附加 `transcriptPaginationVirtualizationEnabled: true`
    - 若 transcript ready，则附加 selected tail page 或 requested page。

- `handleChildAction()`：
  - ACP Skills 的 `load-transcript-page` 保持现状。
  - ACP Chat 的 `load-transcript-page` 单独处理：
    - 读取当前 active backend/conversation。
    - 校验 child payload 中的 backendId/conversationId 与当前 active scope 一致。
    - 调 page reader。
    - 强制 `postAcpChatSnapshot(..., { transcriptPage })`。

- 调度策略：
  - 保留单一 frontend subscription，不把它限制为 `acp-chat`。
  - 可把当前 `schedulePostSnapshot()` 细化成 tab-specific schedule，但不要新增 conversation subscription。
  - active tab 是 ACP Chat 时调 ACP Chat snapshot 构造；active tab 是 ACP Skills 时沿用 `postAcpSkillRunSnapshot`；active tab 是 SkillRunner 时沿用 `scheduleSkillRunnerSidebarRefresh`。
  - backend refresh 只在 install、child-ready、tab-switch、backend-manager 后触发。

风险控制：

- page request 不调用 `getAcpFrontendSnapshot()` 或 `refreshAcpConversationBackends()`。
- ordinary snapshot 和 page snapshot 不共享过多可变状态。
- late page 必须被 child scope guard 拦截。
- 不使用主机端全量 `JSON.stringify(snapshot)` 去重；若需要去重，使用 cheap signature。

建议 cheap signature 字段：

- active tab、target、backendId、conversationId。
- status、busy、permission request id、session id。
- transcriptRevision、transcriptState、selected page cursor/total/revision/item ids。
- chat display mode、drawer open state、backend/session selector revision。

### 阶段 6：ACP Chat child 渲染分页 transcript

修改：

- `addon/content/sidebar/acp-chat.js`

目标：

- 使用 shared renderer 的 page virtualization。
- 只渲染属于当前 backend/conversation 的 selected page。
- ready-without-page 不复用旧 page。

关键设计：

- 增加：
  - `transcriptPageSignature`
  - `transcriptPaginationVirtualizationEnabled`
  - `transcriptPageKey(backendId, conversationId)`
  - `selectedTranscriptPageForConversation(snapshot, backendId, conversationId)`
  - `selectedTranscriptPageSignature(page)`
  - `resetTranscriptVirtualState(container, pageKey)`

- `renderTranscript(snapshot)`：
  - 切 scope reset。
  - loading/failed 先处理。
  - 偏好开启且 transcript ready 但无 page：显示 loading，且不清掉已确认的同 scope ready page。
  - 有 page 时：
    - `items = page.items`
    - `virtualized = true`
    - `pageKey = backendId + "\n" + conversationId`
    - `page = selectedTranscriptPage`
  - `onRequestPage` 发 `load-transcript-page`，payload 带 backendId/conversationId/cursor/limit。

风险控制：

- 切 conversation 后不能显示旧 conversation transcript。
- 同 revision 的 loading snapshot 不能清掉已渲染的 ready page。
- page mismatch 不进入 renderer。

## 测试与验证建议

优先扩展现有测试，不新增低价值文本锁定测试。

### Session manager 行为测试

文件：

- `test/core/96-acp-session-manager.test.ts`

建议用例：

1. `getAcpConversationUiSnapshot(..., { itemMode: "structural" })` 只返回 plan items，不包含 message/tool_call/thought。
2. 默认 `getAcpConversationUiSnapshot()` 仍返回 full items，保护兼容行为。
3. `readAcpConversationTranscriptPageForUi()` 返回当前 conversation 的 page DTO，包含 backendId、conversationId、requestId、transcriptRevision、limit。
4. mirror 未 ready 但 durable transcript 存在时，page reader 仍可返回 page。
5. 偏好开启时 live chunk 不让 full transcript 进入 structural snapshot。
6. active conversation 的 live transcript update 仍能触发 UI 可见更新，但不会通知/构造 full snapshot。
7. background conversation 的纯 transcript update 不触发当前 ACP Chat child snapshot。
8. 默认 `subscribeAcpFrontendSnapshots` 语义不因 ACP Chat structural 模式而改变。

### UI smoke 行为测试

文件：

- `test/core/97-acp-ui-smoke.test.ts`

建议用例：

1. shared renderer items-only virtualized 不触发 `onRequestPage`。
2. SkillRunner `run-dialog.js` 使用 virtualized items mode，且没有 `sendAction("load-transcript-page")`。
3. ACP Chat ready-without-page 显示 loading，不复用旧 page。
4. ACP Chat late page scope mismatch 不渲染。
5. ACP Chat page scope match 后渲染，并可发送下一页请求。
6. ACP Skills 现有 page virtualization 行为保持不变。
7. 共享 frontend subscription 未被限制到 ACP Chat：ACP Skills store change 仍能触发 ACP Skills snapshot，SkillRunner 偏好/task change 仍能触发 SkillRunner refresh。
8. ACP Chat 主机端不存在全量 `JSON.stringify(snapshot)` 签名路径；若存在签名，应是字段级 cheap signature。

### 手工验证

1. ACP Skills：
   - 切换多个 run。
   - 滚动长 transcript。
   - 确认旧 run page 不复活。

2. ACP Chat：
   - 长对话 streaming。
   - 切换 conversation。
   - 滚动加载前页。
   - 后端断开/重连后 snapshot 仍能恢复。

3. SkillRunner：
   - 长输出 run。
   - 切换 selected task。
   - plain/bubble 模式切换。
   - 展开/折叠 tool activity group。

## 不建议列入本轮的事项

- 重写 ACP Chat session index cache。
- 将所有 ACP snapshot subscriptions 改成 itemMode-aware。
- 为 SkillRunner 增加后端分页。
- 引入新的全局 read model cache。
- 重新设计 assistant workspace shell 的整体 snapshot 协议。
- 使用 `notifyFrontend: false` 作为 ACP Chat live update 的常规路径。
- 新增 `subscribeAcpConversationSnapshots` 作为 workspace sidebar 的第二 UI 刷新源。
- 对完整 panel snapshot 做主机端全量 JSON stringify 去重。

这些事项可能有长期价值，但不应和本轮 transcript 渲染迁移绑定。

## 推荐实施顺序

1. [x] 先落 shared renderer items-only virtual source，并用 smoke test 锁住。
2. [x] 接入 SkillRunner 虚拟化，因为它不牵涉后端分页，风险最低。
3. [x] 在 ACP session manager 增加窄版 structural snapshot，确保 full 默认行为不变。
4. [ ] 增加 ACP Chat page reader，保留 per-session pending write flush 和 durable store fallback。
5. [ ] 在 workspace sidebar 加 ACP Chat selected page 编排、active-tab 分流和 cheap signature。
6. [ ] 增加 ACP Chat live/background refresh 过滤，复制 ACP Skills 的 publication-path 治理思路。
7. [ ] 在 ACP Chat child 加 page rendering guard。
8. [ ] 最后再调整 backend refresh 边界触发，确保不影响 ACP Skills/SkillRunner。

这样做可以保证每一步都有独立可验证结果，不会再出现一次性读模型隔离导致三个面板同时失效的问题。
