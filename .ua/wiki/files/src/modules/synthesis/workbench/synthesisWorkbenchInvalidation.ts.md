
# src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/workbench](../../../../../modules/src/modules/synthesis/workbench.md)
<!-- node: file:src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts -->

工作台失效广播：维护 sidecar 变化监听者集合，把受影响的 Surface 名单、来源引用与原因一次性广播出去，供各区域按自身 signature 决定是否重渲染。
源码：[src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts](../../../../../../../src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [uiModel.ts](../uiModel.ts.md) | src/modules/synthesis/uiModel.ts | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchTab.ts](synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [workflowHostClient.ts](../../synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [notifySynthesisWorkbenchSidecarChanged](../../../../../symbols/globals.md) | 函数 | 32–51 | 广播 sidecar 变化事件并返回被通知的监听者数量与最终失效 Surface 列表，供调用方做诊断。 |
| [registerSynthesisWorkbenchSidecarChangeListener](../../../../../symbols/globals.md) | 函数 | 23–30 | 注册 sidecar 变化监听者并返回取消注册函数。 |
