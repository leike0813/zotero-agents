
# src/modules/workflowExecution/messageFormatter.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/messageFormatter.ts -->

工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。
源码：[src/modules/workflowExecution/messageFormatter.ts](../../../../../../src/modules/workflowExecution/messageFormatter.ts)

## 符号（2）
<!-- node: function:src/modules/workflowExecution/messageFormatter.ts:createLocalizedMessageFormatter -->
<!-- node: function:src/modules/workflowExecution/messageFormatter.ts:localizeWorkflowText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createLocalizedMessageFormatter | 函数 | 31–92 | 中等 | localization、formatter、factory | 0 | 构造满足消息格式化契约的本地化格式化器，供各 seam 统一产出文案。 |
| localizeWorkflowText | 函数 | 8–29 | 简单 | localization、i18n、fallback | 1 | 按 locale key 查工作流文案，addon 资源不可用时回落 fallback。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [locale.ts](../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [runtimeBridge.ts](../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [workflowExecuteMessage.ts](workflowExecuteMessage.ts.md) | src/modules/workflowExecution/workflowExecuteMessage.ts | 工作流执行消息与 toast 文案的构建层：把执行结果、错误与队列进度组装成可本地化的展示文案。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [duplicateGuardSeam.ts](duplicateGuardSeam.ts.md) | src/modules/workflowExecution/duplicateGuardSeam.ts | 工作流重复执行守卫：比对进行中的任务摘要与待执行单元的身份（任务名、目标父条目、输入单元），识别重复后阻止提交并给出可读原因。 |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [preparationSeam.ts](preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [workflowExecute.ts](../workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createLocalizedMessageFormatter | 函数 | 31–92 | 构造满足消息格式化契约的本地化格式化器，供各 seam 统一产出文案。 |
| localizeWorkflowText | 函数 | 8–29 | 按 locale key 查工作流文案，addon 资源不可用时回落 fallback。 |
