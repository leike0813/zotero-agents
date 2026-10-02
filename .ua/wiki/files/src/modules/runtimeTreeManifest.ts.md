
# src/modules/runtimeTreeManifest.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/runtimeTreeManifest.ts -->

目录清单工具：把持久化目录树序列化为 manifest 结构并比较差异，用于检测文件是否需要重新物化或清理。
源码：[src/modules/runtimeTreeManifest.ts](../../../../../src/modules/runtimeTreeManifest.ts)

## 符号（2）
<!-- node: function:src/modules/runtimeTreeManifest.ts:rebaseRuntimeTreeManifest -->
<!-- node: function:src/modules/runtimeTreeManifest.ts:scanRuntimeTreeWithIo -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebaseRuntimeTreeManifest | 函数 | 303–316 | 简单 | persistence、manifest、path-resolution、utility | 0 | 把 manifest 的路径前缀重定位到新根目录，便于跨安装位置比较同一份资产。 |
| [scanRuntimeTreeWithIo](../../../symbols/src/modules/runtimeTreeManifest.ts/scanRuntimeTreeWithIo.md) | 函数 | 173–301 | 复杂 | persistence、manifest、tree、injection | 1 | 通过注入的 IO 回调扫描目录树并生成 manifest：记录文件大小、摘要与可比较的结构化警告。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebaseRuntimeTreeManifest | 函数 | 303–316 | 把 manifest 的路径前缀重定位到新根目录，便于跨安装位置比较同一份资产。 |
| [scanRuntimeTreeWithIo](../../../symbols/src/modules/runtimeTreeManifest.ts/scanRuntimeTreeWithIo.md) | 函数 | 173–301 | 通过注入的 IO 回调扫描目录树并生成 manifest：记录文件大小、摘要与可比较的结构化警告。 |
