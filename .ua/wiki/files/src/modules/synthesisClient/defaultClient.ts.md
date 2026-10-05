
# src/modules/synthesisClient/defaultClient.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesisClient](../../../../modules/src/modules/synthesisClient.md)
<!-- node: file:src/modules/synthesisClient/defaultClient.ts -->

默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。
源码：[src/modules/synthesisClient/defaultClient.ts](../../../../../../src/modules/synthesisClient/defaultClient.ts)

## 符号（3）
<!-- node: function:src/modules/synthesisClient/defaultClient.ts:disposeGeneration -->
<!-- node: function:src/modules/synthesisClient/defaultClient.ts:getDefaultSynthesisClient -->
<!-- node: function:src/modules/synthesisClient/defaultClient.ts:shutdownDefaultSynthesisClient -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| disposeGeneration | 函数 | 47–64 | 简单 | 生命周期、清理、synthesis | 1 | 释放一代 client composition 的清理任务，确保 sidecar 连接与监听被正确释放。 |
| [getDefaultSynthesisClient](../../../../symbols/src/modules/synthesisClient/defaultClient.ts/getDefaultSynthesisClient.md) | 函数 | 86–114 | 中等 | 单例、client、生命周期、入口点 | 2 | 获取默认 SynthesisClient：已就绪则复用，否则创建新 generation 并跟踪其初始化与清理。 |
| shutdownDefaultSynthesisClient | 函数 | 164–177 | 简单 | 生命周期、关闭、清理 | 0 | 关闭默认 client 并排空待完成的清理任务，用于插件卸载与测试重置。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [nativeComposition.ts](nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCapabilityRegistry.ts](../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeSynthesisRoutes.ts](../hostBridge/server/routes/hostBridgeSynthesisRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts | Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。 |
| [itemObserver.ts](../synthesis/itemObserver.ts.md) | src/modules/synthesis/itemObserver.ts | 监听 Zotero 条目与子笔记变更，识别文献评分等 managed note 变更并发出 Synthesis 读模型失效通知。 |
| [synthesisProductionOwner.ts](../synthesis/production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisWorkbenchTab.ts](../synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [testRuntimeCleanup.ts](../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowHostClient.ts](workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowParameterOptions.ts](../workflow/settings/workflowParameterOptions.ts.md) | src/modules/workflow/settings/workflowParameterOptions.ts | 工作流动态参数候选项的来源解析器，按参数声明的来源类型从 Synthesis sidecar 合约或 Zotero Host 能力 Broker 拉取可选值并附带诊断信息。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [getDefaultSynthesisClient](../../../../symbols/src/modules/synthesisClient/defaultClient.ts/getDefaultSynthesisClient.md) | 函数 | 86–114 | 获取默认 SynthesisClient：已就绪则复用，否则创建新 generation 并跟踪其初始化与清理。 |
| shutdownDefaultSynthesisClient | 函数 | 164–177 | 关闭默认 client 并排空待完成的清理任务，用于插件卸载与测试重置。 |
