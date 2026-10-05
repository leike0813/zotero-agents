
# projectAssistantWorkspacePanel
<!-- node: function:src/sidebar/assistantPanelModel.js:projectAssistantWorkspacePanel -->

面板投影总入口：把 ACP Chat / ACP Skills / SkillRunner 的原始 snapshot 归一化为各区域可直接消费的统一面板 DTO。
类型：函数  
复杂度：复杂  
入边数：1  
标签：projection、entry-point、data-model、assistant-workspace、ssot  
所属文件：[src/sidebar/assistantPanelModel.js](../../../../files/src/sidebar/assistantPanelModel.js.md)
源码：[src/sidebar/assistantPanelModel.js:1178](../../../../../../src/sidebar/assistantPanelModel.js#L1178)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceAcpChild.js](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:— | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [exactWorkspaceDrawerSections](exactWorkspaceDrawerSections.md) | src/sidebar/assistantPanelModel.js:921–1074 | 把抽屉 DTO 投影为分区分组结构，供 context 与 details 抽屉分别消费。 |
| [exactWorkspaceEmptyChrome](../../../../files/src/sidebar/assistantPanelModel.js.md) | src/sidebar/assistantPanelModel.js:1076–1176 | 空态 chrome 投影：组装无会话/无任务时的横幅、提示与工具栏占位内容。 |
| [exactWorkspaceTask](../../../../files/src/sidebar/assistantPanelModel.js.md) | src/sidebar/assistantPanelModel.js:771–865 | 单个工作区任务的完整投影：状态轴、动作列表、进度与时间信息一次成型。 |
