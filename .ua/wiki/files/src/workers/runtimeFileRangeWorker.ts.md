
# src/workers/runtimeFileRangeWorker.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/workers](../../../modules/src/workers.md)
<!-- node: file:src/workers/runtimeFileRangeWorker.ts -->

Zotero worker 侧实现：按 runtimeFileRangeProtocol 在 worker 中执行大文件的按行区间读取，避免主线程阻塞。
源码：[src/workers/runtimeFileRangeWorker.ts](../../../../../src/workers/runtimeFileRangeWorker.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeFileRangeProtocol.ts](../modules/runtimeFileRangeProtocol.ts.md) | src/modules/runtimeFileRangeProtocol.ts | 定义跨运行时读取文件分片的请求/响应协议类型，供 runtimeFileRangeReader 与其 worker 侧实现共享。 |
