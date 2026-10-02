
# PanelAction
<!-- node: function:src/sidebar/components/ActionControls.tsx:PanelAction -->

动作分发组件：按动作类型选择按钮、开关或下拉控件渲染。
类型：函数  
复杂度：简单  
入边数：2  
标签：component、dispatch、ui-control、preact  
所属文件：[src/sidebar/components/ActionControls.tsx](../../../../../files/src/sidebar/components/ActionControls.tsx.md)
源码：[src/sidebar/components/ActionControls.tsx:171](../../../../../../../src/sidebar/components/ActionControls.tsx#L171)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [WorkspaceTask](../ContextDrawerRegion.tsx/WorkspaceTask.md) | src/sidebar/components/ContextDrawerRegion.tsx:138–305 | 单个工作区任务行：状态徽章、文案、进度与动作的完整呈现。 |
| [AuthSection](../../../../../files/src/sidebar/components/HintRegion.tsx.md) | src/sidebar/components/HintRegion.tsx:144–275 | 认证区块：展示后端认证方式、状态与登录/授权动作。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [PanelActionButton](../../../../../files/src/sidebar/components/ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx:21–43 | 面板动作按钮，按 DTO 中的 tone 与 disabled 状态渲染并派发动作。 |
| [PanelActionSwitch](../../../../../files/src/sidebar/components/ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx:45–99 | 开关型动作控件，用于后端连接、展示模式等二态切换。 |
| [SelectControl](../../../../../files/src/sidebar/components/ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx:210–269 | 通用下拉选择控件，负责选项值与文案映射并回报选择结果。 |
