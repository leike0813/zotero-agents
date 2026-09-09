# Assistant Workspace 重构改进候选分析

日期：2026-07-25
来源：基于 `artifact/assistant-workspace-user-behavior-analysis-20260725.md`（同日，基线 `aa44a7a2`）撰写过程中的发现，对照 `artifact/assistant-workspace-refactor-plan-20260718.md` 逐项核对。
定位：行为分析文档记录"现状是什么"，本文档记录"现状里哪些不合理、哪些可以改、归到哪一栏"。分类标准两条：**是否已在重构计划内**、**是否改变用户可见行为**。重构治理原则是"行为变更不搭重构便车"，因此所有改变用户可见行为的条目都必须显式决策——本文档的价值就在于把这些决策点全部摆出来。

## A. 已在重构计划内（无需新增工作，列出对应 phase 与注意点）

| 发现 | 计划覆盖 | 注意点 |
|---|---|---|
| SkillRunner legacy 快照路径、切换 run 时 transcript 整棵重建 | Phase 3（收敛到 publication plane，获得 region 隔离与 owner-first） | 切换体验变化是**用户可感知的改进**，验收时应明确归类为"更流畅"而非"无感"，避免被误判为回归 |
| 手写 diff/签名守卫（4 层） | Phase 2（Preact keyed diff 替代） | 行为由 Phase 0 的 node-identity 测试锁定 |
| Chat/Skills 数据面双份实现（mirror/LRU/streaming 各 ~700-800 LOC） | Phase 4 合并 | — |
| `chatThinkingCore.js`、`adaptLegacyTranscriptItem`、run-dialog.js 主体删除 | Phase 3 | thinking 折叠交互当前本就不暴露（§6.5），删除对用户无感 |
| 无发送方的 host route（含 `set-chat-display-mode` 的宿主分支） | Phase 1 已标 `TODO(contract)` ×5 | 去留决策仍悬置，见 §D 决策点 |
| 性能基线与 live Zotero 7/9 回放矩阵从未执行 | Phase 5 | — |

## B. 建议重构期间/重构后修复（bug 或接线断裂；B1 已拍板，其余仍需显式决策）

### B1. Details drawer 折叠失效（字段名不匹配）——**已决策：按 bug 修复**

现状：宿主标记 `collapsed: true`，model 原样透传，渲染器却判断 `collapsible`/`defaultCollapsed`——所有 section 永远全部展开（`assistantPanelModel.js:2131` vs `assistantPanelRenderer.js:554-555`）。

**注意：Phase 1 的 wire drift 机制抓不到这个问题。** `collapsed` 在 wire 白名单内、子页也正确透传，断点在 model→renderer 的子页内部字段名，不在跨边界契约上。这是现有安全网的一个真实盲区。

**决策（2026-07-25，用户拍板）**：这是 bug，按原意图修复——Diagnostics（Chat）、Output revisions / Runtime logs / Result JSON（Skills）恢复默认折叠、点击展开。**时机：重构完成后顺手修**，不搭重构便车、不阻塞合并；修复时同步更新行为分析文档 §2.5/§7.1.1 与检查清单 §8.3 的对应条目。

### B2. Plain/Bubble 切换未接宿主持久化

宿主侧已有按 conversation 持久化 display mode 的机制（`acpConversationStore.ts:290,834`；`assistantWorkspaceSidebar.ts:3258-3266` 的 `set-chat-display-mode` 分支），但子页切换路径纯本地、从不发送——重载后一律回到 plain。接线是断的。修复只需子页把切换发回宿主，行为变化是"重载后记住用户选择"，低风险。

### B3. usage gauge 刷新时机

`usage_update` 只触发 composer 重发布，而 composer publication 的 wire 白名单不含 usage——gauge 数字实际只在 owner-presentation 重发布时才刷新（行为分析 §5.6，代码推断未运行时验证）。用户看到的是执行中 gauge 不动、某个无关事件后突然跳变。修复方向：让 `usage_update` 驱动 presentation 重发布，或把 usage 纳入 composer 通道。Phase 2 重写 composer 组件时是天然窗口。

### B4. acp-skills 首帧 empty-state 默认可见

两个 ACP 骨架的唯一差异：acp-skills 的 empty-state 无 `hidden`、acp-chat 有（`acp-skill-run.html:38` vs `acp-chat.html:38`）。JS 启动后按 owner 有无统一接管，用户只可能在极短首帧看到一次空态闪烁。统一为默认隐藏即可，行为中立。

### B5. 行为语义的测试盲区

`collapsed` 失配能存活至今，说明 Phase 0 的 node-identity 测试锁定的是"DOM 不被无谓重建"，锁不住"section 应该折叠"这类**可见语义**。建议 Phase 2 组件化时，为每个组件补充针对可见行为的测试（默认折叠态、按钮文案、禁用条件），而不只锁定 DOM 身份。这是对计划 Phase 2 测试策略的补充，不是新增阶段。

## C. 建议重构后优化（新能力或 UX 改进，明确改变用户可见行为，单独立项决策）

按"成本/收益"粗排：

1. **streaming 视觉指示**：`is-streaming` class 已经打在 DOM 上，全部 CSS 中没有对应规则——streaming 期间用户无法区分"正在输出"与"就这么多"。纯 CSS 工作（光标或呼吸效果），成本极低收益高。
2. **"回到底部"按钮**：用户上滚后新内容静默到达，没有提示也没有快捷回底方式（已 grep 确认不存在）。长 transcript 高频场景。
3. **Esc 关闭抽屉**：`src/sidebar` 全部文件中没有任何 Escape 处理（已 grep 确认），三个抽屉只能点遮罩或 Close。
4. **`alert()` 错误弹窗替换**：action 异常统一走原生 `host.win.alert`，阻塞且体验割裂；项目已有 notificationHub 模块可接。
5. **输入草稿/历史的跨重启持久化**：当前草稿、50 条历史、tool 组展开状态都只在子页内存，iframe 存活期内安全，但 Zotero 重启即丢。草稿持久化到宿主（按 owner）是常见诉求。
6. **Chat 多认证方法选择**：`Authenticate` 恒携带 `authMethods[0]?.id`（`acpChatWorkspaceSurface.ts:500-501`），后端提供多个 method 时用户无法选择。需要一个小选择 UI（hint 区或下拉）。
7. **usage gauge 展示 costText**：Chat 的 usage 数据已含 costText 但 gauge 不展示，可放进 tooltip。
8. **textarea 自动增高**：当前固定 58px/24vh 手动拖拽，长 prompt 输入体验一般。
9. **message counts active 态视觉区分**：active 字段在签名里但无独立视觉，执行中计数条可以脉冲一下。
10. **SkillRunner waiting_auth 1.5s 轮询事件化**：取决于后端能力，可能不可行；Phase 3 收敛时顺带评估即可，不必单独投入。

## D. 看似问题、实则有意设计（不建议动）

- **Chat 断连空闲 composer 可写**（`acpChatWorkspaceSurface.ts:306-316` 不检查 connected）：可能是支持离线起草/重连后发送的语义；`ensureSession` 在断连时的行为未确认。收紧前先确认产品意图，列为决策点而非缺陷。
- **Permission drawer 不自动弹出**：审批在 hint 区内联即可完成，drawer 只承载 command/preview 详情；自动弹出会打断正在阅读 transcript 的用户。
- **Details 每次打开重新请求**：保证看到的是最新状态，且有 owner/epoch 守卫防迟到；缓存反而引入陈旧数据风险。
- **三个 iframe 无懒加载**：并行加载换来 tab 切换零成本与状态天然保留；侧边栏场景下三个页面的加载开销可接受。
- **Skills 副标题两槽位不去重**（两个 "📊 文献分析" 并存）：契约明确两槽位语义不同，审计文档专门强调过。

## E. 决策点清单（合并前需逐项拍板）

1. ~~**Details 折叠**：恢复原意图（默认折叠）还是追认现状（全部展开）？（B1）~~ **已决策（2026-07-25）**：按 bug 处理，恢复原意图，重构完成后修复。（B1）
2. **Chat 断连可写**：维持现状还是收紧为 connected 才可写？（D 栏第 1 条）
3. **`TODO(contract)` ×5 的无发送方 host route**：删除还是保留？（A 栏）
4. **SkillRunner 切 run 体验变化**：在验收与 release notes 中明确归类为预期改进。（A 栏）
5. **B2/B3 两项接线修复**：搭 Phase 2 组件化的便车是否可接受（严格说它们改变了用户可见行为——持久化记住视图、gauge 实时刷新——但都属于纠错性质）？
6. **C 类优化的排期**：哪些进入合并后的第一批迭代？个人建议 1、2、3 优先（成本低、日常高频）。

## 附：与重构计划的关系总结

计划本身覆盖了所有**架构层**问题（双更新范式、契约 SSOT、数据面重复、god 文件、手写 diff），本文档没有发现计划遗漏的架构缺陷。计划的盲区在**行为语义层**：Phase 0 的安全网锁定 DOM 身份与 wire 字段，但锁不住"该折叠的没折叠""该实时刷新的不刷新"这类可见行为语义——B1 失配就是实例。B5 的测试策略补充和 E 栏的决策点，是本文档对计划的两项实质增量。
