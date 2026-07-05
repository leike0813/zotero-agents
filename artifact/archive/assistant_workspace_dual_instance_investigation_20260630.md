# Assistant Workspace 双实例设计排查记录

日期：2026-06-30

范围：Zotero 侧边栏 Assistant Workspace 容器、SkillRunner 面板渲染诊断

状态：只读分析记录；尚未进入修复实现

## 背景

Linux 下出现一个现象：SkillRunner 面板中的聊天窗不渲染内容，但任务本身能够正常执行；ACP 两个面板正常。排查过程中，诊断脚本先后发现页面中存在两个 `assistant-workspace.html` 实例，其中一个隐藏、一个可见。

这个发现解释了此前诊断中“看起来像 SkillRunner iframe 尺寸为 0、`requestAnimationFrame` 不触发”的假象：第一次脚本命中了隐藏的 Assistant Workspace，而不是当前正在显示的那一个。

## 诊断证据

用户在 Zotero 开发者工具中执行脚本后得到的关键现象如下：

- 顶层存在两个 Assistant Workspace iframe，URL 都是 `chrome://zotero-skills/content/sidebar/assistant-workspace.html`。
- 第 0 个实例处于隐藏状态，近似表现为 `visibility: hidden`、宽高为 `0 x 0`。
- 第 1 个实例处于可见状态，近似表现为 `585 x 1236`。
- 可见实例中的 SkillRunner iframe 尺寸正常，近似为 `585 x 1204`。
- 可见实例内的基础依赖和全局对象存在，包括 `AssistantPanelModel`、`projectSkillRunnerPanelSnapshot`、`AssistantPanelRenderer`、`AssistantTranscriptRenderer`、`SkillRunnerThinkingChatCore`、`markdownit`。
- 可见实例中 `#run-root`、`#skillrunner-main`、`#chat-panel` 都可见且有正常尺寸。
- 可见实例中 transcript 行数为 0，聊天区域 HTML 为空。
- 可见实例里的 `requestAnimationFrame` 能触发，但同一探针中的 `setTimeout` 没有触发。

因此，聊天窗空白不是因为可见 SkillRunner iframe 没挂载、CSS 把聊天区域隐藏、渲染器全局缺失，或后端任务没有完成。

## 代码证据

当前代码确实会主动创建两个 Assistant Workspace 容器，而不是单一实例。

相关位置：

- `src/modules/assistantWorkspaceSidebar.ts`
  - `mountLibraryPane()` 创建 library item pane 里的 Assistant Workspace。
  - `mountReaderPane()` 创建 reader/context pane 里的 Assistant Workspace。
  - `installAssistantWorkspaceSidebarShell()` 安装时会分别挂载 library pane 与 reader pane。
  - `activateTarget()` 根据当前上下文切换 active target。
  - `deactivateTarget()` 隐藏非活动 target，而不是销毁它。
  - `removeAssistantWorkspaceSidebarShell()` 只在整体卸载时移除两个 pane。

也就是说，双实例是当前设计结果：library 和 reader/context 各持有一个 workspace，切换时隐藏非活动实例，保留其 DOM、iframe 和内部状态。

## 当前判断

这不是简单的泄漏，而是一个有意为之但需要更清晰边界的双挂载设计。

该设计可能带来的收益是：

- library 与 reader/context 可以各自保留布局和上下文状态。
- 切换场景时无需重新创建完整 UI，响应更快。
- pane 生命周期与 Zotero 的不同宿主区域直接对应。

但它也带来明显工程风险：

- 诊断脚本、自动化测试或人工调试容易选中隐藏实例，导致结论偏移。
- 隐藏实例仍然保留子 iframe 和内部状态，可能出现旧标题、旧 action trace、旧会话快照继续存在的错觉。
- 如果消息路由或 snapshot 推送没有严格限制到 active target，隐藏实例可能接收不该处理的更新。
- 隐藏 iframe 在 Linux/Zotero/Firefox 运行环境下可能受到计时器、渲染帧、可见性节流等影响，进而放大渲染类问题。
- 同一个 UI 概念有两个 live DOM 实例，长期会提高状态一致性和测试成本。

## 与 SkillRunner 空白聊天窗的关系

双 Assistant Workspace 实例解释了第一轮诊断为什么会看到隐藏 iframe 和 0 尺寸面板，也解释了用户此前隐约感觉到“似乎存在两个 workspace”的现象。

但它目前不像 SkillRunner 聊天窗空白的直接根因。更强的直接证据指向 SkillRunner 面板自身的 transcript 调度路径：

- `addon/content/sidebar/run-dialog.js` 中 `scheduleTranscriptRender(panelSnapshot)` 使用 `requestAnimationFrame(function () { setTimeout(run, 0); })`。
- 在可见 SkillRunner iframe 中，探针显示 `requestAnimationFrame` 能触发，但后续 `setTimeout` 没触发。
- `renderTranscript(panelSnapshot)` 依赖这个调度链执行；如果 `setTimeout(run, 0)` 没执行，聊天 transcript 就不会落到 DOM。
- ACP 面板没有暴露同样的空白问题，说明问题更可能集中在 SkillRunner 独有的延迟渲染路径，而不是统一 transcript renderer 本身。

因此当前应把两件事分开看：

1. SkillRunner 空白聊天窗：优先修复或规避 `requestAnimationFrame -> setTimeout -> renderTranscript` 这条链在 Zotero Linux iframe 中失效的问题。
2. 双 Assistant Workspace：作为架构债记录并收敛边界，避免隐藏实例继续干扰诊断、状态和消息路由。

## 建议方向

短期建议保留双实例设计，但把它变成显式、可诊断、边界清楚的设计：

- 在 DOM 上标记 workspace 的 `target`、`scope`、`active` 状态，方便脚本和测试只选择可见活动实例。
- 所有主动推送、snapshot refresh、action routing 都应以 active target 为准，避免隐藏实例参与实时更新。
- 诊断脚本默认过滤 `visibility: hidden`、`display: none`、`0 x 0` 的 workspace 和子 iframe。
- 在代码注释或架构文档中明确：当前允许同时存在 library 与 reader/context 两个 workspace，但同一时刻只有一个是活动实例。
- SkillRunner transcript 渲染修复应独立处理，不要把双实例问题作为直接根因。

中期可以评估两种更彻底的设计：

- 懒加载/卸载非活动 workspace：切换到某个 target 时创建，离开后销毁或冻结。优点是状态更少、资源更低；缺点是切换恢复和上下文保存更复杂。
- 单 workspace host：把 Assistant Workspace 抽到 pane 之外，只保留一个 UI 实例，随 active context 切换数据。优点是状态模型最清晰；缺点是可能需要重做与 Zotero library pane、reader pane 的布局集成。

当前更稳妥的路径是先做小步收敛：明确双实例不变量，修正诊断选择逻辑，再单独修复 SkillRunner transcript 调度。

## 后续验证点

建议后续修复或重构前先确认以下事实：

- 切换 library/reader 后，只有可见 active workspace 接收新的 SkillRunner snapshot。
- 隐藏 workspace 不会响应用户 action，不会触发新的任务提交或状态刷新。
- 隐藏 workspace 中的 SkillRunner iframe 是否仍会运行定时器、接收 `postMessage`、执行 snapshot render。
- 将 `scheduleTranscriptRender()` 改为同步渲染或微任务优先后，Linux 可见 SkillRunner iframe 中 transcript 是否恢复。
- ACP 两个面板的 transcript 调度路径与 SkillRunner 是否存在实质差异。
