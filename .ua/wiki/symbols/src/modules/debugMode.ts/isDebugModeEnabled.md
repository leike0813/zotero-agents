
# isDebugModeEnabled
<!-- node: function:src/modules/debugMode.ts:isDebugModeEnabled -->

判断插件是否处于调试模式，是大部分诊断日志分支的总开关。
类型：函数  
复杂度：简单  
入边数：4  
标签：feature-flag、diagnostics、utility  
所属文件：[src/modules/debugMode.ts](../../../../files/src/modules/debugMode.ts.md)
源码：[src/modules/debugMode.ts:82](../../../../../../src/modules/debugMode.ts#L82)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [onShutdown](../../../../files/src/hooks.ts.md) | src/hooks.ts:1170–1273 | 插件关闭流程：逐步停用运行时 owner、注销 observer 与菜单、释放 sidecar 与 bridge 资源。 |
| [inspectAssistantWorkspaceReplayPostSnapshotTimer](../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:724–852 | 自检快照重放定时器状态，用于诊断发布延迟来源。 |
| [recordWorkspacePublicationAck](../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:898–989 | 记录宿主对某次发布的回执，更新 ack 阶段与时延统计。 |
| [registerWorkspacePublication](../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:316–344 | 注册一条工作区发布记录并纳入生命周期裁剪，防止无界增长。 |

## 调用

该符号没有记录对外调用。
