
# src/modules/runtimeFileRangeProtocol.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/runtimeFileRangeProtocol.ts -->

定义跨运行时读取文件分片的请求/响应协议类型，供 runtimeFileRangeReader 与其 worker 侧实现共享。
源码：[src/modules/runtimeFileRangeProtocol.ts](../../../../../src/modules/runtimeFileRangeProtocol.ts)

## 符号（2）
<!-- node: function:src/modules/runtimeFileRangeProtocol.ts:normalizeRuntimeFileRange -->
<!-- node: function:src/modules/runtimeFileRangeProtocol.ts:partitionRuntimeFileRanges -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeRuntimeFileRange | 函数 | 40–47 | 简单 | file-range、validation、contract、utility | 0 | 归一化单个字节区间请求，裁剪越界端点并拒绝非正长度区间。 |
| partitionRuntimeFileRanges | 函数 | 49–74 | 简单 | file-range、batching、worker、contract | 1 | 把文件分片请求按有界批次分组，避免单次 IPC 载荷过大导致 worker 阻塞。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeFileRangeReader.ts](runtimeFileRangeReader.ts.md) | src/modules/runtimeFileRangeReader.ts | 在 Zotero 沙箱中按字节区间读取大文件的读取器，配合 runtimeFileRangeProtocol 与 worker 实现分段读取，避免一次性载入造成内存峰值。 |
| [runtimeFileRangeWorker.ts](../workers/runtimeFileRangeWorker.ts.md) | src/workers/runtimeFileRangeWorker.ts | Zotero worker 侧实现：按 runtimeFileRangeProtocol 在 worker 中执行大文件的按行区间读取，避免主线程阻塞。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| normalizeRuntimeFileRange | 函数 | 40–47 | 归一化单个字节区间请求，裁剪越界端点并拒绝非正长度区间。 |
| partitionRuntimeFileRanges | 函数 | 49–74 | 把文件分片请求按有界批次分组，避免单次 IPC 载荷过大导致 worker 阻塞。 |
