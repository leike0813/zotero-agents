
# appendRuntimeLog
<!-- node: function:src/modules/runtimeLogManager.ts:appendRuntimeLog -->

追加一条运行时日志：规范化字段、按诊断模式与级别过滤、分配序号并触发订阅通知与持久化调度。
类型：函数  
复杂度：中等  
入边数：3  
标签：logging、entry-point、core  
所属文件：[src/modules/runtimeLogManager.ts](../../../../files/src/modules/runtimeLogManager.ts.md)
源码：[src/modules/runtimeLogManager.ts:1258](../../../../../../src/modules/runtimeLogManager.ts#L1258)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runShutdownStepWithTimeout](../../../../files/src/hooks.ts.md) | src/hooks.ts:1111–1168 | 以超时上限执行单个关闭步骤，失败或超时都记录诊断而不阻塞其余清理。 |
| [preloadAcpChatBackendsForWorkspaceInit](../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:455–474 | 在工作区初始化期间预取 ACP Chat 后端列表，缩短首屏等待。 |
| [runAcpChatBackendRefreshBoundary](../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:433–453 | 在边界窗口内执行 ACP Chat 后端刷新，避免刷新风暴打断 transcript 渲染。 |

## 调用

该符号没有记录对外调用。
