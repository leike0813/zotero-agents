
# src/modules/synthesis/itemObserver.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/itemObserver.ts -->

监听 Zotero 条目与子笔记变更，识别文献评分等 managed note 变更并发出 Synthesis 读模型失效通知。
源码：[src/modules/synthesis/itemObserver.ts](../../../../../../src/modules/synthesis/itemObserver.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/itemObserver.ts:isSynthesisLibraryReadModelInvalidationEvent -->
<!-- node: function:src/modules/synthesis/itemObserver.ts:recordSynthesisZoteroItemNotifications -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isSynthesisLibraryReadModelInvalidationEvent | 函数 | 116–140 | 中等 | 事件过滤、失效通知、zotero-事件 | 1 | 判断条目通知是否影响 Synthesis 读模型，覆盖条目本身的增删改与评分笔记变更。 |
| recordSynthesisZoteroItemNotifications | 函数 | 142–180 | 中等 | 观察者、事件处理、synthesis | 0 | 订阅 Zotero 通知并把命中的读模型失效事件转发给 Synthesis 分发路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaultClient.ts](../synthesisClient/defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [notePayloadCodec.ts](../zoteroHost/notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [synthesisWorkbenchTab.ts](workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isSynthesisLibraryReadModelInvalidationEvent | 函数 | 116–140 | 判断条目通知是否影响 Synthesis 读模型，覆盖条目本身的增删改与评分笔记变更。 |
| recordSynthesisZoteroItemNotifications | 函数 | 142–180 | 订阅 Zotero 通知并把命中的读模型失效事件转发给 Synthesis 分发路径。 |
