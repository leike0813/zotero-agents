
# src/modules/runtimeFileRangeReader.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/runtimeFileRangeReader.ts -->

在 Zotero 沙箱中按字节区间读取大文件的读取器，配合 runtimeFileRangeProtocol 与 worker 实现分段读取，避免一次性载入造成内存峰值。
源码：[src/modules/runtimeFileRangeReader.ts](../../../../../src/modules/runtimeFileRangeReader.ts)

## 符号（5）
<!-- node: function:src/modules/runtimeFileRangeReader.ts:ensureWorkerGeneration -->
<!-- node: function:src/modules/runtimeFileRangeReader.ts:readRuntimeFileRangesWithWorker -->
<!-- node: function:src/modules/runtimeFileRangeReader.ts:readWorkerBatch -->
<!-- node: class:src/modules/runtimeFileRangeReader.ts:RuntimeFileIoError -->
<!-- node: function:src/modules/runtimeFileRangeReader.ts:shutdownRuntimeFileRangeReader -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureWorkerGeneration | 函数 | 159–198 | 中等 | worker、lifecycle、file-range、runtime | 0 | 惰性创建并复用 file range worker 的当前 generation，失效时重建并拒绝陈旧响应。 |
| readRuntimeFileRangesWithWorker | 函数 | 233–242 | 简单 | file-range、worker、entry-point、file-io | 1 | 对多分片请求分批走 worker 读取，聚合字节片段后交给调用方。 |
| readWorkerBatch | 函数 | 200–231 | 中等 | worker、file-range、async、runtime | 0 | 向 worker 投递一批分片请求并按批聚合结果，超时或 generation 失效时收敛为错误。 |
| RuntimeFileIoError | 类 | 14–30 | 简单 | error-handling、file-range、worker、type-definition | 0 | 文件分片读取失败时抛出的错误类型，携带 path、range 与底层原因，便于上层区分 IO 故障与协议故障。 |
| shutdownRuntimeFileRangeReader | 函数 | 244–256 | 简单 | worker、lifecycle、cleanup、runtime | 0 | 终止并清空 worker 引用，插件卸载或切换读取策略时释放资源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeFileRangeProtocol.ts](runtimeFileRangeProtocol.ts.md) | src/modules/runtimeFileRangeProtocol.ts | 定义跨运行时读取文件分片的请求/响应协议类型，供 runtimeFileRangeReader 与其 worker 侧实现共享。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| readRuntimeFileRangesWithWorker | 函数 | 233–242 | 对多分片请求分批走 worker 读取，聚合字节片段后交给调用方。 |
| shutdownRuntimeFileRangeReader | 函数 | 244–256 | 终止并清空 worker 引用，插件卸载或切换读取策略时释放资源。 |
