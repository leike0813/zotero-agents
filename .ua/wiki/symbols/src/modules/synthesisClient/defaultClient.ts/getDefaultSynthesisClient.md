
# getDefaultSynthesisClient
<!-- node: function:src/modules/synthesisClient/defaultClient.ts:getDefaultSynthesisClient -->

获取默认 SynthesisClient：已就绪则复用，否则创建新 generation 并跟踪其初始化与清理。
类型：函数  
复杂度：中等  
入边数：2  
标签：单例、client、生命周期、入口点  
所属文件：[src/modules/synthesisClient/defaultClient.ts](../../../../../files/src/modules/synthesisClient/defaultClient.ts.md)
源码：[src/modules/synthesisClient/defaultClient.ts:86](../../../../../../../src/modules/synthesisClient/defaultClient.ts#L86)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [initializeSynthesisBuiltinTagsOnStartup](../../../../../files/src/hooks.ts.md) | src/hooks.ts:934–951 | 启动时确保 Synthesis 内置标签已写入插件状态存储，缺失则补齐。 |
| [createWorkflowSynthesisHostApi](../../../../../files/src/modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts:543–933 | 构造工作流侧 Synthesis API：代理 topic plan/apply、digest apply、tag audit 与文献快照等全部工作流能力。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createNativeSynthesisClientComposition](../../../../globals.md) | — | 创建原生合成客户端组合：把原生 Port 接到 clientPortAdapter 上，返回完整的 SynthesisClient 实现。 |
