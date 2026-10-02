
# src/modules/workflowExecution/feedbackPolicy.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/feedbackPolicy.ts -->

工作流通知策略的单一判定点，按 manifest 的 execution.feedback.showNotifications 决定是否展示完成通知。
源码：[src/modules/workflowExecution/feedbackPolicy.ts](../../../../../../src/modules/workflowExecution/feedbackPolicy.ts)

## 符号（1）
<!-- node: function:src/modules/workflowExecution/feedbackPolicy.ts:shouldShowWorkflowNotifications -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| shouldShowWorkflowNotifications | 函数 | 3–5 | 简单 | policy、notification、predicate | 1 | 按 manifest 通知配置判定是否展示工作流完成通知。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [preparationSeam.ts](preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [workflowExecute.ts](../workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowMenu.ts](../workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| shouldShowWorkflowNotifications | 函数 | 3–5 | 按 manifest 通知配置判定是否展示工作流完成通知。 |
