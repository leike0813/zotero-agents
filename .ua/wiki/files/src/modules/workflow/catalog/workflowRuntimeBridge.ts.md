
# src/modules/workflow/catalog/workflowRuntimeBridge.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/workflowRuntimeBridge.ts -->

工作流运行时桥：向工作流包暴露一个极小的宿主能力面（appendRuntimeLog 与 showToast），同时写入 globalThis 与 addon 对象，供工作流包在无 import 权限下调用宿主。
源码：[src/modules/workflow/catalog/workflowRuntimeBridge.ts](../../../../../../../src/modules/workflow/catalog/workflowRuntimeBridge.ts)

## 符号（3）
<!-- node: function:src/modules/workflow/catalog/workflowRuntimeBridge.ts:clearWorkflowRuntimeBridgeForTests -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntimeBridge.ts:installWorkflowRuntimeBridge -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntimeBridge.ts:writeAddonBridge -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| clearWorkflowRuntimeBridgeForTests | 函数 | 65–79 | 简单 | bridge、cleanup、testing、exported | 0 | 清除两个挂载点上的桥对象，供测试隔离。 |
| installWorkflowRuntimeBridge | 函数 | 55–58 | 简单 | bridge、installation、workflow-runtime、exported | 0 | 向 globalThis 与 addon 同时写入工作流运行时桥。 |
| writeAddonBridge | 函数 | 42–53 | 简单 | bridge、addon、workflow-runtime | 0 | 把桥对象挂到 addon 上，供经 addon 引用访问运行时的工作流包使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [feedbackSeam.ts](../../workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| clearWorkflowRuntimeBridgeForTests | 函数 | 65–79 | 清除两个挂载点上的桥对象，供测试隔离。 |
| installWorkflowRuntimeBridge | 函数 | 55–58 | 向 globalThis 与 addon 同时写入工作流运行时桥。 |
