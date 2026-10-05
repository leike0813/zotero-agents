
# src/sidebar/assistantPanelModel.js
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/assistantPanelModel.js -->

Assistant Workspace 面板的纯投影模型：把工作区 snapshot 归一化为面板 DTO，包含状态/应用态语义、精确工作区字段、任务与分组、抽屉区块与空态 chrome。
源码：[src/sidebar/assistantPanelModel.js](../../../../../src/sidebar/assistantPanelModel.js)

## 符号（16）
<!-- node: function:src/sidebar/assistantPanelModel.js:applyStateLabel -->
<!-- node: function:src/sidebar/assistantPanelModel.js:assistantDrawerLabels -->
<!-- node: function:src/sidebar/assistantPanelModel.js:exactWorkspaceDetails -->
<!-- node: function:src/sidebar/assistantPanelModel.js:exactWorkspaceDrawerSections -->
<!-- node: function:src/sidebar/assistantPanelModel.js:exactWorkspaceEmptyChrome -->
<!-- node: function:src/sidebar/assistantPanelModel.js:exactWorkspaceOptionGroup -->
<!-- node: function:src/sidebar/assistantPanelModel.js:exactWorkspacePlan -->
<!-- node: function:src/sidebar/assistantPanelModel.js:exactWorkspaceQueuedTask -->
<!-- node: function:src/sidebar/assistantPanelModel.js:exactWorkspaceTask -->
<!-- node: function:src/sidebar/assistantPanelModel.js:normalizeApplyState -->
<!-- node: function:src/sidebar/assistantPanelModel.js:normalizeAssistantPanelSnapshot -->
<!-- node: function:src/sidebar/assistantPanelModel.js:normalizeTaskApplyStatus -->
<!-- node: function:src/sidebar/assistantPanelModel.js:projectAssistantWorkspacePanel -->
<!-- node: function:src/sidebar/assistantPanelModel.js:statusLabel -->
<!-- node: function:src/sidebar/assistantPanelModel.js:statusTone -->
<!-- node: function:src/sidebar/assistantPanelModel.js:taskStatusFields -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyStateLabel | 函数 | 89–109 | 简单 | label-projection、presentation、i18n、assistant-workspace | 0 | 依据归一化后的 apply 状态挑选展示文案，覆盖应用中、已应用、需复核等情形。 |
| assistantDrawerLabels | 函数 | 309–344 | 中等 | label-projection、drawer、i18n、assistant-workspace | 0 | 构造抽屉区域的完整文案集合，保证抽屉标题、按钮与空态都有默认值。 |
| exactWorkspaceDetails | 函数 | 702–729 | 简单 | projection、drawer、exact-shape、assistant-workspace | 0 | 详情抽屉条目投影为精确 DTO，逐字段裁剪避免宿主注入额外内容。 |
| [exactWorkspaceDrawerSections](../../../symbols/src/sidebar/assistantPanelModel.js/exactWorkspaceDrawerSections.md) | 函数 | 921–1074 | 复杂 | projection、drawer、exact-shape、assistant-workspace | 1 | 把抽屉 DTO 投影为分区分组结构，供 context 与 details 抽屉分别消费。 |
| exactWorkspaceEmptyChrome | 函数 | 1076–1176 | 中等 | projection、empty-state、exact-shape、assistant-workspace | 1 | 空态 chrome 投影：组装无会话/无任务时的横幅、提示与工具栏占位内容。 |
| exactWorkspaceOptionGroup | 函数 | 432–462 | 中等 | projection、validation、exact-shape、assistant-workspace | 0 | 把选项组 DTO 投影为工具栏/横幅可消费的精确形状，拒绝多余或缺失键。 |
| exactWorkspacePlan | 函数 | 731–769 | 中等 | projection、plan、exact-shape、assistant-workspace | 0 | 计划条目投影为精确 DTO，统一条目状态、文案与可执行动作。 |
| exactWorkspaceQueuedTask | 函数 | 867–919 | 中等 | projection、task-queue、exact-shape、assistant-workspace | 0 | 队列中任务的投影，比运行态任务多出排队位次与不可操作语义。 |
| exactWorkspaceTask | 函数 | 771–865 | 中等 | projection、task-model、exact-shape、assistant-workspace | 1 | 单个工作区任务的完整投影：状态轴、动作列表、进度与时间信息一次成型。 |
| normalizeApplyState | 函数 | 75–87 | 简单 | state-normalization、validation、assistant-workspace、utility | 0 | 把后端 apply/落地状态归一化为受控枚举，缺省时回落到未应用态。 |
| normalizeAssistantPanelSnapshot | 函数 | 346–431 | 中等 | normalization、entry-point、validation、assistant-workspace | 0 | 面板快照入口归一化：校验形状、补全缺省字段并抹除非受支持的 extra 键。 |
| normalizeTaskApplyStatus | 函数 | 203–216 | 简单 | state-normalization、validation、assistant-workspace、utility | 0 | 对任务级 apply 状态做再归一化，容忍后端不同字段拼写。 |
| [projectAssistantWorkspacePanel](../../../symbols/src/sidebar/assistantPanelModel.js/projectAssistantWorkspacePanel.md) | 函数 | 1178–2064 | 复杂 | projection、entry-point、data-model、assistant-workspace、ssot | 1 | 面板投影总入口：把 ACP Chat / ACP Skills / SkillRunner 的原始 snapshot 归一化为各区域可直接消费的统一面板 DTO。 |
| statusLabel | 函数 | 119–201 | 中等 | label-projection、state-mapping、assistant-workspace、presentation | 1 | 状态 token 到展示文案的集中映射表式函数，区分终态、忙碌态与中性态。 |
| statusTone | 函数 | 33–69 | 中等 | state-mapping、presentation、assistant-workspace、utility | 1 | 把任务/运行状态 token 映射为语义色调（ok/busy/idle/error 等），供徽章与 LED 类名共用。 |
| taskStatusFields | 函数 | 218–268 | 中等 | projection、task-status、assistant-workspace、data-model | 1 | 汇总单任务的全部状态展示字段：色调、标签、进度、错误与操作项。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantPanelRenderer.js](assistantPanelRenderer.js.md) | src/sidebar/assistantPanelRenderer.js | 面板 chrome 的命令式 DOM 渲染器：管理 toolbar/banner/plan 等托管挂载点、区域标记与 overlay 关闭，并向宿主派发面板 action。 |
| [assistantWorkspaceAcpChild.js](assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| normalizeAssistantPanelSnapshot | 函数 | 346–431 | 面板快照入口归一化：校验形状、补全缺省字段并抹除非受支持的 extra 键。 |
| [projectAssistantWorkspacePanel](../../../symbols/src/sidebar/assistantPanelModel.js/projectAssistantWorkspacePanel.md) | 函数 | 1178–2064 | 面板投影总入口：把 ACP Chat / ACP Skills / SkillRunner 的原始 snapshot 归一化为各区域可直接消费的统一面板 DTO。 |
